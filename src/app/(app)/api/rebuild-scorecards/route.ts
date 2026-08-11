import { NextResponse } from "next/server";
import { getPayload } from "payload";

import configPromise from "@/payload.config";

/**
 * TEMPORARY. Re-saves every "Championship" TeeTimeRounds doc for 2013 (id 15) so its afterChange
 * hook recreates any missing blank Scorecards -- needed because yesterday's data clear deleted
 * Scorecards directly (bypassing that hook, which only fires on a TeeTimeRounds save).
 */
export async function GET() {
  const payload = await getPayload({ config: configPromise });

  const rounds = await payload.find({
    collection: "tee-time-rounds",
    where: { and: [{ championship: { equals: 15 } }, { round: { equals: "Championship" } }] },
    limit: 50,
    depth: 0,
  });

  for (const round of rounds.docs) {
    await payload.update({ collection: "tee-time-rounds", id: round.id, data: {} });
  }

  const scorecards = await payload.find({
    collection: "scorecards",
    where: { championship: { equals: 15 } },
    limit: 50,
    depth: 0,
  });

  return NextResponse.json({
    roundsResaved: rounds.docs.length,
    scorecardCount: scorecards.docs.length,
    players: scorecards.docs.map((s) => s.player),
  });
}
