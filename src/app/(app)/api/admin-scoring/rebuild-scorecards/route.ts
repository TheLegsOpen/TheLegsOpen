import { NextResponse } from "next/server";
import { getPayload } from "payload";

import configPromise from "@/payload.config";

/**
 * TEMPORARY, one-shot route -- re-saves the active championship's "Championship" tee-time
 * round(s) to re-trigger TeeTimeRounds.ts's own afterChange hook, which creates a blank
 * Scorecard for any player in the groups that doesn't already have one. Used to recreate the
 * scorecards deleted by the earlier reset-championship route, without duplicating that hook's
 * logic here. Not linked from anywhere in the UI. Delete this file after use.
 */
export async function POST() {
  const payload = await getPayload({ config: configPromise });

  const active = await payload.find({ collection: "championships", where: { isActive: { equals: true } }, limit: 1, depth: 0 });
  const championship = active.docs[0];
  if (!championship) {
    return NextResponse.json({ error: "No active championship found" }, { status: 404 });
  }
  const championshipId = championship.id;

  const rounds = await payload.find({
    collection: "tee-time-rounds",
    where: { and: [{ championship: { equals: championshipId } }, { round: { equals: "Championship" } }] },
    limit: 50,
    depth: 0,
  });

  for (const round of rounds.docs) {
    // No-op re-save of the round's own current data -- just enough to re-run its afterChange
    // hook, which only creates a scorecard for a player that doesn't already have one.
    await payload.update({ collection: "tee-time-rounds", id: round.id, data: {} });
  }

  const scorecards = await payload.find({
    collection: "scorecards",
    where: { championship: { equals: championshipId } },
    limit: 100,
    depth: 1,
  });

  return NextResponse.json({
    championshipId,
    championshipYear: championship.year,
    roundsResaved: rounds.docs.length,
    scorecardsNow: scorecards.docs.length,
    players: scorecards.docs.map((d) => (typeof d.player === "object" ? d.player.name : d.player)),
  });
}
