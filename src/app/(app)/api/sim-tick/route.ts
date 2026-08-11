import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";

import configPromise from "@/payload.config";

interface TickEntry {
  playerName: string;
  holeNumber: number;
  strokes: number;
}

/**
 * TEMPORARY, test-run-only route -- applies one tick's worth of real-time hole scores (one player
 * at a time, exactly as a scorer would type them in) against the active championship's scorecards.
 * Deliberately does NOT set context.suppressLiveBlog, unlike the Group Scoring bulk route, so this
 * exercises the full live-blog trigger engine as intended for this test run. Not linked from
 * anywhere in the UI. Delete this file once the test run is complete.
 */
export async function POST(request: NextRequest) {
  const payload = await getPayload({ config: configPromise });
  const body = (await request.json()) as { entries?: TickEntry[] };
  const entries = body.entries ?? [];

  const active = await payload.find({ collection: "championships", where: { isActive: { equals: true } }, limit: 1, depth: 0 });
  const championship = active.docs[0];
  if (!championship) {
    return NextResponse.json({ error: "No active championship found" }, { status: 404 });
  }

  const results: { playerName: string; holeNumber: number; strokes: number; holesCompleted?: number | null }[] = [];
  const errors: { playerName: string; message: string }[] = [];

  for (const entry of entries) {
    try {
      const playerResult = await payload.find({ collection: "players", where: { name: { equals: entry.playerName } }, limit: 1, depth: 0 });
      const player = playerResult.docs[0];
      if (!player) {
        errors.push({ playerName: entry.playerName, message: "Player not found" });
        continue;
      }

      const scorecardResult = await payload.find({
        collection: "scorecards",
        where: { and: [{ player: { equals: player.id } }, { championship: { equals: championship.id } }] },
        limit: 1,
        depth: 0,
      });
      const scorecard = scorecardResult.docs[0];
      if (!scorecard) {
        errors.push({ playerName: entry.playerName, message: "Scorecard not found" });
        continue;
      }

      const existingHoles = scorecard.holes ?? [];
      const holes = Array.from({ length: 18 }, (_, i) => {
        const existing = existingHoles[i];
        return {
          strokes: i === entry.holeNumber - 1 ? entry.strokes : (existing?.strokes ?? undefined),
          noReturn: existing?.noReturn ?? false,
          fairwayHit: existing?.fairwayHit ?? undefined,
          greenInRegulation: existing?.greenInRegulation ?? undefined,
          putts: existing?.putts ?? undefined,
        };
      });

      const updated = await payload.update({ collection: "scorecards", id: scorecard.id, data: { holes } });
      results.push({ playerName: entry.playerName, holeNumber: entry.holeNumber, strokes: entry.strokes, holesCompleted: updated.holesCompleted });
    } catch (err) {
      errors.push({ playerName: entry.playerName, message: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json({ championshipId: championship.id, results, errors });
}
