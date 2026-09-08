import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { searchUkGolfClubsPage, getUkGolfClubCourses, type UkGolfCountryCode } from "@/lib/uk-golf-api";

/**
 * TEMPORARY probe (2026-09-08). Delete once tee-set selection is settled.
 *
 * The importer only ever returns a course's default tee, so Old Petty imports as Red when the
 * round is played off White. uk-golf-api.ts claims tee_set_id is ignored, but the API's own
 * figures (14,223 tee sets, 251,333 holes -- about 17.7 per tee set, documented as "par, yardage
 * and stroke index for every hole on every tee") say per-tee data exists, so the earlier finding
 * looks like the wrong call rather than a missing capability.
 *
 * A first pass established that /tee-sets/{id}/scorecard and /tee-sets/{id}/holes both 404, and
 * that course ids are UUIDs. What is left to test is whether /courses/{uuid}/scorecard honours a
 * tee set parameter, which needs real ids.
 *
 * Works in three steps so no ids ever have to be dug out of devtools, and so the free tier's
 * 5 requests/minute is not blown in one go:
 *
 *   ?club=Castle+Stuart          -> matching clubs and their ids
 *   ?clubId=<uuid>               -> that club's courses, each with its tee sets and ids
 *   ?courseId=<uuid>&teeSetId=<uuid> -> probes the scorecard parameter variants
 *
 * Admin-authenticated and read-only.
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

    const json = (await res.json()) as {
      tee_set?: { colour?: string; name?: string; course_rating?: number; slope_rating?: number };
      holes?: { hole_number: number; par: number; stroke_index: number; yardage: number }[];
    };

    // The identity of the returned tee is the whole question, so surface that plus a couple of
    // holes -- enough to tell two tees apart by yardage and stroke index without dumping 18 rows.
    return {
      path,
      status: res.status,
      teeReturned: [json.tee_set?.colour, json.tee_set?.name].filter(Boolean).join(" ") || "unknown",
      courseRating: json.tee_set?.course_rating,
      slopeRating: json.tee_set?.slope_rating,
      totalYards: (json.holes ?? []).reduce((sum, h) => sum + (h.yardage ?? 0), 0),
      firstThreeHoles: (json.holes ?? []).slice(0, 3).map((h) => ({ hole: h.hole_number, par: h.par, si: h.stroke_index, yards: h.yardage })),
    };
  } catch (err) {
    return { path, error: err instanceof Error ? err.message : "failed" };
  }
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const payload = await getPayload({ config: configPromise });
  const { user } = await payload.auth({ headers: request.headers });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const club = params.get("club");
  const clubId = params.get("clubId");
  const courseId = params.get("courseId");
  const teeSetId = params.get("teeSetId");
  const country = (params.get("country") ?? "SCO") as UkGolfCountryCode;

  // Step 1 -- find the club and its id.
  if (club) {
    const found: { id: string; name: string; city?: string }[] = [];
    for (let page = 1; page <= 3; page += 1) {
      const result = await searchUkGolfClubsPage(country, club, page);
      found.push(...result.matches.map((c) => ({ id: c.id, name: c.name, city: c.city })));
      if (page >= result.totalPages) break;
    }
    return NextResponse.json({ step: "clubs", country, query: club, matches: found });
  }

  // Step 2 -- list that club's courses, each with its tee sets, so a White tee id can be picked.
  if (clubId) {
    const courses = await getUkGolfClubCourses(clubId);
    return NextResponse.json({
      step: "courses",
      courses: courses.map((c) => ({
        id: c.id,
        name: c.name,
        teeSets: c.teeSets.map((t) => ({ id: t.id, name: t.name, totalYardage: t.totalYardage })),
      })),
    });
  }

  // Step 3 -- does the scorecard endpoint honour a tee set at all? Compare the tee each variant
  // returns: if they all come back identical, the parameter really is ignored.
  if (courseId) {
    const candidates = [
      `/courses/${courseId}/scorecard`,
      ...(teeSetId
        ? [
            `/courses/${courseId}/scorecard?tee_set_id=${teeSetId}`,
            `/courses/${courseId}/scorecard?teeSetId=${teeSetId}`,
            `/courses/${courseId}/scorecard?tee_set=${teeSetId}`,
            `/courses/${courseId}/tee-sets/${teeSetId}/scorecard`,
          ]
        : []),
    ];

    const results = [];
    for (const path of candidates) {
      results.push(await probe(path));
      await new Promise((r) => setTimeout(r, 1500));
    }
    return NextResponse.json({ step: "scorecard", courseId, teeSetId, results }, { headers: { "cache-control": "no-store" } });
  }

  return NextResponse.json({
    error: "Pass one of: ?club=<name>  |  ?clubId=<uuid>  |  ?courseId=<uuid>&teeSetId=<uuid>",
  }, { status: 400 });
}
