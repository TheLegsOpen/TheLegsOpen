import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";

import configPromise from "@/payload.config";

/**
 * Temporary, local-only route for pacing the real 2014 championship's hole-by-hole results into
 * production over real time, mirroring how 2013 was actually done -- one hole at a time via
 * payload.update() (hooks fire normally, live-blog generates naturally, nothing suppressed).
 * Never committed/deployed -- deleted once the round is fully entered.
 *
 * Groups tee off staggered (11.00 / 11.10 / 11.20), so they shouldn't show the same "thru" on
 * the live tee-times page -- group 0 (11.00) is the reference leader; groups 1/2 only advance
 * once the leader has pulled far enough ahead to owe them a catch-up hole, converging on a
 * steady ~1-hole and ~2-hole gap respectively and holding it for the rest of the round.
 *
 * Self-healing by design: a group's "current hole" is the MINIMUM holesCompleted across its own
 * members (not just the first player), and advancing a group only saves the hole for whichever
 * members haven't already reached it -- so if one call partially fails partway through a group
 * (a slow/dropped request mid-loop desyncing that player from their groupmates), the very next
 * call detects the lagging member and catches them up on their own before the group moves on,
 * rather than silently skipping their missed hole forever.
 */

interface PlayerRow {
  playerId: number;
  scorecardId: number;
  group: 0 | 1 | 2;
  strokes: number[]; // 18 gross strokes, hole 1 first
}

const PLAYERS: PlayerRow[] = [
  { playerId: 24, scorecardId: 71, group: 0, strokes: [7, 8, 5, 4, 6, 3, 7, 5, 6, 7, 5, 4, 4, 5, 3, 10, 8, 6] }, // Bobby Ferguson
  { playerId: 26, scorecardId: 72, group: 0, strokes: [5, 5, 5, 3, 6, 4, 5, 5, 6, 6, 3, 5, 5, 6, 4, 5, 4, 6] }, // John Pow
  { playerId: 28, scorecardId: 73, group: 0, strokes: [7, 6, 11, 4, 6, 5, 6, 10, 10, 5, 9, 5, 6, 6, 4, 6, 6, 6] }, // John Taylor
  { playerId: 92, scorecardId: 74, group: 1, strokes: [5, 7, 6, 5, 6, 4, 7, 6, 8, 10, 5, 6, 3, 5, 4, 4, 5, 9] }, // Jim Yuille
  { playerId: 32, scorecardId: 75, group: 1, strokes: [6, 5, 9, 4, 6, 3, 7, 11, 11, 5, 5, 10, 5, 6, 5, 7, 7, 9] }, // David Pow
  { playerId: 84, scorecardId: 76, group: 1, strokes: [6, 4, 7, 3, 5, 4, 4, 4, 5, 6, 4, 4, 4, 5, 5, 5, 4, 6] }, // Davie Clelland
  { playerId: 21, scorecardId: 77, group: 2, strokes: [5, 11, 11, 4, 8, 4, 7, 7, 5, 7, 7, 4, 4, 7, 5, 7, 7, 7] }, // Mark Alston
  { playerId: 29, scorecardId: 78, group: 2, strokes: [5, 6, 9, 3, 9, 6, 6, 4, 7, 6, 3, 5, 6, 11, 7, 11, 12, 6] }, // Iain MacLeod
  { playerId: 30, scorecardId: 79, group: 2, strokes: [11, 8, 7, 2, 7, 3, 12, 4, 5, 4, 5, 4, 6, 5, 7, 8, 9, 5] }, // Scott Ingram
  { playerId: 31, scorecardId: 80, group: 2, strokes: [5, 4, 6, 3, 6, 4, 4, 5, 4, 5, 4, 7, 6, 7, 4, 6, 5, 11] }, // Robert Hamilton
];

const DESIRED_GAP: Record<0 | 1 | 2, number> = { 0: 0, 1: 1, 2: 2 };

async function saveHole(payload: Awaited<ReturnType<typeof getPayload>>, row: PlayerRow, holeNumber: number) {
  const strokes = row.strokes[holeNumber - 1];
  const doc = await payload.findByID({ collection: "scorecards", id: row.scorecardId });
  const holes = Array.isArray(doc.holes) ? [...doc.holes] : [];
  while (holes.length < holeNumber) holes.push({ holeNumber: holes.length + 1 });
  holes[holeNumber - 1] = { ...holes[holeNumber - 1], holeNumber, strokes };

  const updated = await payload.update({ collection: "scorecards", id: row.scorecardId, data: { holes } });
  return { playerId: row.playerId, scorecardId: row.scorecardId, strokes, holesCompleted: updated.holesCompleted ?? 0 };
}

export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  // Own env var, not PAYLOAD_SECRET -- this route now runs on production (local dev was hitting
  // sustained 20-30s response times even after a clean restart, while raw Postgres access stayed
  // fast, pointing at the dev-server process itself rather than the database), and production's
  // real PAYLOAD_SECRET is a Vercel "sensitive" variable this session can't read. Set only in
  // Vercel's own env config, never committed to source.
  if (!process.env.TEMP_BACKFILL_SECRET || secret !== process.env.TEMP_BACKFILL_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  const payload = await getPayload({ config: configPromise });

  const groups: Record<0 | 1 | 2, PlayerRow[]> = { 0: [], 1: [], 2: [] };
  for (const row of PLAYERS) groups[row.group].push(row);

  const memberHoles: Record<number, number> = {};
  for (const row of PLAYERS) {
    const doc = await payload.findByID({ collection: "scorecards", id: row.scorecardId });
    memberHoles[row.scorecardId] = doc.holesCompleted ?? 0;
  }

  const currentHoles: Record<0 | 1 | 2, number> = { 0: 0, 1: 0, 2: 0 };
  for (const g of [0, 1, 2] as const) {
    currentHoles[g] = Math.min(...groups[g].map((r) => memberHoles[r.scorecardId]));
  }

  if (currentHoles[0] >= 18 && currentHoles[1] >= 18 && currentHoles[2] >= 18) {
    return NextResponse.json({ done: true, message: "All 18 holes already recorded for every group." });
  }

  const results: { playerId: number; scorecardId: number; strokes: number; holesCompleted: number }[] = [];

  async function advanceGroup(g: 0 | 1 | 2, nextHole: number) {
    // Only save for members who haven't already reached this hole -- catches up a lagging
    // player left behind by a previous partial failure without double-saving their groupmates.
    for (const row of groups[g]) {
      if (memberHoles[row.scorecardId] < nextHole) {
        results.push(await saveHole(payload, row, nextHole));
      }
    }
  }

  // Leader (group 0) always advances, unconstrained -- it's what the others are paced against.
  if (currentHoles[0] < 18) {
    const nextHole = currentHoles[0] + 1;
    await advanceGroup(0, nextHole);
    currentHoles[0] = nextHole;
  }

  // Followers only advance once the leader is far enough ahead to owe them a catch-up hole --
  // converges on the steady gap within 2-3 calls and holds it for the rest of the round.
  for (const g of [1, 2] as const) {
    if (currentHoles[g] >= 18) continue;
    const gapIfSkipped = currentHoles[0] - currentHoles[g];
    if (gapIfSkipped > DESIRED_GAP[g]) {
      await advanceGroup(g, currentHoles[g] + 1);
    }
  }

  return NextResponse.json({ groupHoles: currentHoles, results });
}
