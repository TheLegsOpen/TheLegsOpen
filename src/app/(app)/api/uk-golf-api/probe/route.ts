import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";

import configPromise from "@/payload.config";

/**
 * TEMPORARY probe (2026-09-08). Delete once tee-set selection is settled.
 *
 * src/lib/uk-golf-api.ts carries a note saying the scorecard endpoint ignores any tee set you ask
 * for and always returns the course default -- which is why importing Old Petty only ever yields
 * the Red card. But the API's own documentation says it stores "par, yardage, and stroke index for
 * every hole on every tee", with 14,223 tee sets and 251,333 holes (~17.7 holes per tee set), so
 * per-tee data plainly exists and we are either calling the wrong endpoint or passing the wrong
 * parameter.
 *
 * This calls the candidates directly and reports status plus a small shape sample of each, so the
 * real importer can be built on fact rather than on another guess. Admin-authenticated rather than
 * secret-protected, and read-only.
 */

const RAPIDAPI_HOST = "uk-golf-course-data-api.p.rapidapi.com";

async function probe(path: string) {
  const key = process.env.UK_GOLF_API_KEY;
  if (!key) return { path, error: "UK_GOLF_API_KEY not set" };

  try {
    const res = await fetch(`https://${RAPIDAPI_HOST}${path}`, {
      headers: { "X-RapidAPI-Key": key, "X-RapidAPI-Host": RAPIDAPI_HOST },
      cache: "no-store",
    });

    if (!res.ok) {
      return { path, status: res.status, body: (await res.text().catch(() => "")).slice(0, 200) };
    }

    const json = (await res.json()) as unknown;
    // Report structure rather than the full payload -- enough to see where holes live and whether
    // they are grouped per tee set, without dumping thousands of rows into the response.
    const describe = (value: unknown, depth = 0): unknown => {
      if (Array.isArray(value)) {
        return { array: value.length, first: depth < 3 && value[0] !== undefined ? describe(value[0], depth + 1) : undefined };
      }
      if (value && typeof value === "object") {
        return Object.fromEntries(
          Object.entries(value as Record<string, unknown>).map(([k, v]) => [
            k,
            depth < 3 ? describe(v, depth + 1) : typeof v,
          ]),
        );
      }
      return typeof value === "string" ? `string(${(value as string).slice(0, 24)})` : typeof value;
    };

    return { path, status: res.status, shape: describe(json) };
  } catch (err) {
    return { path, error: err instanceof Error ? err.message : "failed" };
  }
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const payload = await getPayload({ config: configPromise });
  const { user } = await payload.auth({ headers: request.headers });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const courseId = request.nextUrl.searchParams.get("courseId");
  const teeSetId = request.nextUrl.searchParams.get("teeSetId");
  if (!courseId) return NextResponse.json({ error: "courseId is required" }, { status: 400 });

  // Sequential with a gap: the free tier allows only 5 requests/minute, and a burst would just
  // return 429s and tell us nothing.
  const candidates = [
    `/courses/${courseId}`,
    `/courses/${courseId}/scorecard`,
    ...(teeSetId
      ? [
          `/courses/${courseId}/scorecard?tee_set_id=${teeSetId}`,
          `/tee-sets/${teeSetId}/scorecard`,
          `/tee-sets/${teeSetId}/holes`,
        ]
      : []),
  ];

  const results = [];
  for (const path of candidates) {
    results.push(await probe(path));
    await new Promise((r) => setTimeout(r, 1500));
  }

  return NextResponse.json({ courseId, teeSetId, results }, { headers: { "cache-control": "no-store" } });
}
