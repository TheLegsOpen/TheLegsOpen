import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";

import configPromise from "@/payload.config";

interface GroupUpdate {
  scorecardId: string;
  holes: (number | "X" | null)[];
}

export async function POST(request: NextRequest) {
  const payload = await getPayload({ config: configPromise });
  const { user } = await payload.auth({ headers: request.headers });

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { updates?: GroupUpdate[] };
  const updates = body.updates ?? [];

  const results = [];
  for (const update of updates) {
    if (!update.scorecardId) continue;
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
  }

  return NextResponse.json({ success: true, count: results.length, results });
}
