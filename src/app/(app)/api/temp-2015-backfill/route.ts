import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";

import config from "@/payload.config";

/**
 * Temporary, secret-protected production route for backdating the 2015 championship, paced
 * hole-by-hole against real wall-clock time so live-blog generation fires naturally (same pattern
 * as 2014's temp-2014-backfill route -- see that commit for why: local dev pointed at prod became
 * unreliable for a long-running session). Self-healing / idempotent: every invocation just checks
 * "for each group, is the next unposted hole's scheduled time now in the past?" against each
 * scorecard's own holesCompleted, so calling it repeatedly (a cron-ish poll every ~60s) is safe --
 * nothing is double-posted, and a missed tick just gets caught by the next one. Deleted once the
 * round is fully entered.
 *
 * Schedule: each group's hole N fires at (tee time) + (sum of pacing minutes for holes 1..N),
 * pacing being 6 min for a par 3, 9 min for a par 4, 12 min for a par 5 -- roughly how long a real
 * group takes to play a hole and move to the next tee. Times are precomputed to UTC instants
 * below (BST = UTC+1) rather than trusting any server-side timezone conversion.
 */

const HOLE_PARS = [4, 4, 4, 4, 4, 4, 3, 5, 4, 3, 4, 4, 4, 4, 4, 4, 4, 3];
const PACE_MIN: Record<number, number> = { 3: 6, 4: 9, 5: 12 };

// "NR" holes are represented as null.
type HoleStrokes = (number | null)[];

interface GroupDef {
  teeUtc: string; // ISO instant for hole 1's tee-off (BST tee time - 1h)
  players: { scorecardId: number; strokes: HoleStrokes }[];
}

const GROUPS: GroupDef[] = [
  {
    // Alastair Campbell, Robert Hamilton, Davie Clelland -- tee 13:37 BST = 12:37 UTC
    teeUtc: "2026-08-21T12:37:00Z",
    players: [
      { scorecardId: 81, strokes: [4, 6, 7, 3, 4, 4, 4, 6, 4, 3, 8, 6, 3, 5, 6, 5, 4, 4] },
      { scorecardId: 82, strokes: [5, 5, 4, 5, 9, 4, 4, 5, 3, 4, 4, 6, 4, 4, 5, 5, 4, 3] },
      { scorecardId: 83, strokes: [4, 6, 6, 6, 4, 6, 4, 5, 3, 3, 5, 6, 6, 5, 5, 6, 5, 4] },
    ],
  },
  {
    // Jamie Jordan, Jim Yuille, Alyn Peden -- tee 13:45 BST = 12:45 UTC
    teeUtc: "2026-08-21T12:45:00Z",
    players: [
      { scorecardId: 84, strokes: [4, 5, 5, 7, 7, 3, 6, 6, 4, 6, 5, 5, 5, 7, 5, 4, 5, 4] },
      { scorecardId: 85, strokes: [7, 10, 6, null, 4, null, null, 5, 4, 4, 7, 5, 6, null, null, null, null, null] },
      { scorecardId: 86, strokes: [5, 4, 6, 5, 4, 4, 5, 11, 5, 3, 3, 6, null, null, 4, 4, 5, 4] },
    ],
  },
  {
    // David Burns, Mark Alston, David Pow -- tee 13:52 BST = 12:52 UTC
    teeUtc: "2026-08-21T12:52:00Z",
    players: [
      { scorecardId: 87, strokes: [3, 5, 7, 5, 6, 5, 4, 8, 7, 4, 11, 6, 4, 7, 5, 5, 5, 5] },
      { scorecardId: 88, strokes: [5, 6, 8, 7, 4, 5, 4, 6, 5, 4, 11, 9, 10, 6, 5, 4, 3, 6] },
      { scorecardId: 89, strokes: [10, 8, 5, 8, 7, 8, 10, 13, 3, 7, 4, 5, 4, 5, 5, 4, 4, 4] },
    ],
  },
  {
    // Toby Stanton, John Dick, Scott Ingram -- tee 14:00 BST = 13:00 UTC
    teeUtc: "2026-08-21T13:00:00Z",
    players: [
      { scorecardId: 90, strokes: [7, null, 5, null, 6, 6, 5, 6, 7, 4, 8, 8, 7, 8, 5, 4, 6, 5] },
      { scorecardId: 91, strokes: [5, 5, 8, 5, 5, 8, 6, 7, 6, 4, 4, 5, 6, 6, 5, 6, 6, 6] },
      { scorecardId: 92, strokes: [5, 6, 4, 8, 7, 5, 3, 5, 4, 4, 5, 5, 4, 5, 10, 5, 4, 5] },
    ],
  },
  {
    // David Clee, Gary Simpson, Jamie Bain -- tee 14:07 BST = 13:07 UTC
    teeUtc: "2026-08-21T13:07:00Z",
    players: [
      { scorecardId: 93, strokes: [5, 5, 4, 5, 5, 5, 4, 5, 6, 5, 5, 5, 7, 5, 5, 5, 5, 3] },
      { scorecardId: 94, strokes: [6, 5, 10, 5, 5, 5, 4, 6, 7, 6, 9, 3, 6, 4, 6, 5, 5, 3] },
      { scorecardId: 95, strokes: [9, 8, 4, 6, 8, 4, 3, 5, 6, 4, 5, 10, 7, 6, 4, 4, 5, 4] },
    ],
  },
];

/** Minutes from tee-off to hole N's own posting time (cumulative pacing through hole N). */
function offsetMinutesForHole(holeNumber: number): number {
  let total = 0;
  for (let h = 1; h <= holeNumber; h++) {
    total += PACE_MIN[HOLE_PARS[h - 1]];
  }
  return total;
}

// Self-contained rather than reusing REVALIDATE_SECRET (an unknown value from here) -- fine since
// this whole route is temporary and gets deleted once the round is fully entered.
const BACKFILL_SECRET = "2015-lanark-9f3a7c1e";

export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (secret !== BACKFILL_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  const payload = await getPayload({ config });
  const now = Date.now();
  const posted: { scorecardId: number; holeNumber: number }[] = [];

  for (const group of GROUPS) {
    const teeMs = new Date(group.teeUtc).getTime();

    for (const player of group.players) {
      const scorecard = await payload.findByID({ collection: "scorecards", id: player.scorecardId, depth: 0 }).catch(() => undefined);
      if (!scorecard) continue;

      const holesCompleted = scorecard.holesCompleted ?? 0;
      const nextHole = holesCompleted + 1;
      if (nextHole > 18) continue;

      const dueMs = teeMs + offsetMinutesForHole(nextHole) * 60_000;
      if (now < dueMs) continue;

      const strokeValue = player.strokes[nextHole - 1];
      const existingHoles = (scorecard.holes ?? []) as { holeNumber: number; strokes?: number; noReturn?: boolean }[];
      const holes = [...existingHoles];
      holes[nextHole - 1] = {
        holeNumber: nextHole,
        strokes: strokeValue === null ? undefined : strokeValue,
        noReturn: strokeValue === null,
      };

      await payload.update({ collection: "scorecards", id: player.scorecardId, data: { holes } });
      posted.push({ scorecardId: player.scorecardId, holeNumber: nextHole });
    }
  }

  return NextResponse.json({ postedCount: posted.length, posted, nowUtc: new Date(now).toISOString() });
}
