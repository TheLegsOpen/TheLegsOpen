import { NextResponse } from "next/server";
import { getPayload } from "payload";

import configPromise from "@/payload.config";

/**
 * TEMPORARY. Clears 2013's (id 15) Scorecards, LiveBlogPosts, and LiveBlogTriggerLog, then
 * re-saves its "Championship" TeeTimeRounds docs so the afterChange hook recreates a blank
 * Scorecard per player -- leaves TeeTimeRounds (groups/pairings) untouched throughout. One route
 * covering the full reset-for-retest cycle instead of two separate deploys.
 */
export async function GET() {
  const payload = await getPayload({ config: configPromise });
  const championshipId = 15;

  const [scorecards, liveBlogPosts, triggerLog] = await Promise.all([
    payload.delete({ collection: "scorecards", where: { championship: { equals: championshipId } } }),
    payload.delete({ collection: "live-blog-posts", where: { championship: { equals: championshipId } } }),
    payload.delete({ collection: "live-blog-trigger-log", where: { championship: { equals: championshipId } } }),
  ]);

  const rounds = await payload.find({
    collection: "tee-time-rounds",
    where: { and: [{ championship: { equals: championshipId } }, { round: { equals: "Championship" } }] },
    limit: 50,
    depth: 0,
  });
  for (const round of rounds.docs) {
    await payload.update({ collection: "tee-time-rounds", id: round.id, data: {} });
  }

  const rebuilt = await payload.find({ collection: "scorecards", where: { championship: { equals: championshipId } }, limit: 50, depth: 0 });

  return NextResponse.json({
    scorecardsDeleted: scorecards.docs.length,
    liveBlogPostsDeleted: liveBlogPosts.docs.length,
    triggerLogDeleted: triggerLog.docs.length,
    roundsResaved: rounds.docs.length,
    scorecardsRebuilt: rebuilt.docs.length,
  });
}
