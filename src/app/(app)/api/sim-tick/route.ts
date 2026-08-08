import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";

import configPromise from "@/payload.config";

/**
 * Temporary route for the 2013 championship live-fire simulation (posts real hole-by-hole
 * scores on a schedule to exercise live-blog/leaderboard behavior end to end). Delete once the
 * test run is complete -- see conversation for context.
 */

interface SimPlayer {
  scorecardId: number;
  name: string;
  holes: number[];
}

interface SimGroup {
  name: string;
  startTick: number;
  players: SimPlayer[];
}

const GROUPS: SimGroup[] = [
  {
    name: "Group 1",
    startTick: 0,
    players: [
      { scorecardId: 6, name: "John Pow", holes: [3, 5, 5, 4, 4, 5, 5, 5, 6, 4, 4, 5, 4, 4, 5, 4, 5, 4] },
      { scorecardId: 5, name: "Bobby Ferguson", holes: [4, 5, 6, 3, 4, 5, 6, 5, 3, 5, 4, 4, 5, 4, 5, 4, 4, 5] },
    ],
  },
  {
    name: "Group 2",
    startTick: 1,
    players: [
      { scorecardId: 9, name: "Toby Stanton", holes: [5, 5, 4, 3, 9, 5, 8, 8, 6, 3, 4, 5, 6, 3, 6, 4, 5, 5] },
      { scorecardId: 8, name: "John Taylor", holes: [4, 4, 9, 4, 4, 7, 6, 6, 5, 4, 4, 4, 5, 4, 7, 7, 5, 5] },
      { scorecardId: 7, name: "David Clee", holes: [3, 3, 5, 3, 6, 5, 5, 5, 5, 4, 4, 7, 5, 4, 4, 5, 6, 5] },
    ],
  },
  {
    name: "Group 3",
    startTick: 2,
    players: [
      { scorecardId: 12, name: "Scott Ingram", holes: [5, 5, 4, 3, 6, 7, 6, 7, 5, 4, 6, 4, 4, 5, 4, 7, 6, 5] },
      { scorecardId: 11, name: "Robert Hamilton", holes: [4, 3, 4, 4, 6, 5, 5, 8, 4, 4, 5, 8, 4, 5, 4, 4, 5, 7] },
      { scorecardId: 10, name: "Mark Alston", holes: [5, 6, 6, 4, 4, 5, 6, 6, 4, 3, 4, 5, 6, 6, 5, 5, 5, 6] },
    ],
  },
  {
    name: "Group 4",
    startTick: 3,
    players: [
      { scorecardId: 15, name: "David Pow", holes: [5, 4, 7, 4, 7, 6, 5, 6, 10, 3, 9, 6, 4, 6, 4, 6, 3, 9] },
      { scorecardId: 14, name: "Iain MacLeod", holes: [6, 3, 8, 3, 3, 6, 5, 5, 5, 6, 8, 6, 7, 3, 4, 4, 10, 5] },
      { scorecardId: 13, name: "Alastair Campbell", holes: [3, 3, 4, 4, 5, 4, 6, 5, 4, 3, 4, 4, 4, 3, 5, 5, 5, 4] },
    ],
  },
];

export const LAST_TICK = Math.max(...GROUPS.map((g) => g.startTick + 17));

export async function GET(request: NextRequest) {
  const tickParam = request.nextUrl.searchParams.get("tick");
  const dryRun = request.nextUrl.searchParams.get("dryRun") === "true";
  const tick = tickParam ? Number(tickParam) : NaN;
  if (!Number.isInteger(tick) || tick < 0) {
    return NextResponse.json({ error: "Provide a valid non-negative integer ?tick=" }, { status: 400 });
  }

  const dueGroups = GROUPS.filter((g) => tick >= g.startTick && tick - g.startTick < 18);
  if (dueGroups.length === 0) {
    return NextResponse.json({ tick, lastTick: LAST_TICK, dueGroups: [], message: "No groups due at this tick." });
  }

  const payload = dryRun ? null : await getPayload({ config: configPromise });
  const results: Record<string, unknown>[] = [];

  for (const group of dueGroups) {
    const holeIndex = tick - group.startTick;
    const holeNumber = holeIndex + 1;

    for (const player of group.players) {
      const holes = Array.from({ length: 18 }, (_, i) => ({
        holeNumber: i + 1,
        strokes: i <= holeIndex ? player.holes[i] : undefined,
        noReturn: false,
      }));

      if (dryRun) {
        results.push({ group: group.name, player: player.name, scorecardId: player.scorecardId, holeNumber, strokes: player.holes[holeIndex], dryRun: true });
        continue;
      }

      try {
        const updated = await payload!.update({ collection: "scorecards", id: player.scorecardId, data: { holes } });
        results.push({
          group: group.name,
          player: player.name,
          scorecardId: player.scorecardId,
          holeNumber,
          strokes: player.holes[holeIndex],
          holesCompleted: updated.holesCompleted,
          grossTotal: updated.grossTotal,
        });
      } catch (err) {
        results.push({ group: group.name, player: player.name, scorecardId: player.scorecardId, holeNumber, error: err instanceof Error ? err.message : String(err) });
      }
    }
  }

  return NextResponse.json({ tick, lastTick: LAST_TICK, dueGroups: dueGroups.map((g) => g.name), results });
}
