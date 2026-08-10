import { NextResponse } from "next/server";
import { getPayload } from "payload";

import configPromise from "@/payload.config";

/**
 * TEMPORARY, one-shot route -- deletes all Scorecards / Live Blog Posts / Live Blog Trigger Log
 * rows for the currently active championship and resets its auto-derived stats, ahead of a fresh
 * test run. Not linked from anywhere in the UI. Delete this file after use.
 */
export async function POST() {
  const payload = await getPayload({ config: configPromise });

  const active = await payload.find({ collection: "championships", where: { isActive: { equals: true } }, limit: 1, depth: 0 });
  const championship = active.docs[0];
  if (!championship) {
    return NextResponse.json({ error: "No active championship found" }, { status: 404 });
  }
  const championshipId = championship.id;

  const [scorecards, liveBlogPosts, triggerLog] = await Promise.all([
    payload.delete({ collection: "scorecards", where: { championship: { equals: championshipId } } }),
    payload.delete({ collection: "live-blog-posts", where: { championship: { equals: championshipId } } }),
    payload.delete({ collection: "live-blog-trigger-log", where: { championship: { equals: championshipId } } }),
  ]);

  await payload.update({
    collection: "championships",
    id: championshipId,
    data: {
      completed: false,
      winnerName: null,
      winnerCountry: null,
      winnerPlayer: null,
      winningScore: null,
      scoreToPar: null,
      margin: null,
      runnerUpName: null,
      runnerUpScore: null,
      stablefordWinnerName: null,
      stablefordWinnerCountry: null,
      scratchWinnerName: null,
      scratchWinnerCountry: null,
      ledOutrightAfter9: null,
      deficitAfter9: null,
      largestLeadHolderName: null,
      largestLeadMargin: null,
      largestLeadAfterHole: null,
      championAgeAtWin: null,
      priorAppearances: null,
    },
  });

  return NextResponse.json({
    championshipId,
    championshipYear: championship.year,
    scorecardsDeleted: scorecards.docs?.length ?? scorecards.errors?.length ?? "unknown",
    liveBlogPostsDeleted: liveBlogPosts.docs?.length ?? "unknown",
    triggerLogDeleted: triggerLog.docs?.length ?? "unknown",
  });
}
