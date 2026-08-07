import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";

import configPromise from "@/payload.config";

interface GroupUpdate {
  scorecardId: string;
  holes: (number | "X" | null)[];
}

export async function POST(request: NextRequest) {
  let payload;
  try {
    payload = await getPayload({ config: configPromise });
  } catch (err) {
    return NextResponse.json({ error: `Server init failed: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 });
  }

  const { user } = await payload.auth({ headers: request.headers });

  if (!user) {
    return NextResponse.json({ error: "Your session has expired — log back into /admin and try again." }, { status: 401 });
  }

  let body: { updates?: GroupUpdate[] };
  try {
    body = (await request.json()) as { updates?: GroupUpdate[] };
  } catch {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }
  const updates = body.updates ?? [];

  // Each player is saved independently -- one player's failure (a validation error, a dropped
  // connection, etc.) no longer silently kills the rest of the group's saves.
  const results = [];
  const errors: { scorecardId: string; message: string }[] = [];
  for (const update of updates) {
    if (!update.scorecardId) continue;
    try {
      const holes = update.holes.map((value, i) => ({
        holeNumber: i + 1,
        strokes: value === "X" ? undefined : (value ?? undefined),
        noReturn: value === "X",
      }));
      const updated = await payload.update({
        collection: "scorecards",
        id: update.scorecardId,
        data: { holes },
      });
      results.push({ id: updated.id, holesCompleted: updated.holesCompleted });
    } catch (err) {
      errors.push({ scorecardId: update.scorecardId, message: err instanceof Error ? err.message : String(err) });
    }
  }

  if (errors.length > 0) {
    return NextResponse.json({ success: false, count: results.length, results, errors }, { status: 207 });
  }

  return NextResponse.json({ success: true, count: results.length, results });
}
