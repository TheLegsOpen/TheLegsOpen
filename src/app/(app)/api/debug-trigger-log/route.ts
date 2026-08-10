import { NextResponse } from "next/server";
import { getPayload } from "payload";

import configPromise from "@/payload.config";

/** TEMPORARY, read-only diagnostic route -- full aggregate stats for the active championship's
 * live-blog run: published post counts by category/competition, and trigger-log suppression
 * breakdown by category/reason. Not linked from anywhere in the UI. Delete this file after use. */
export async function GET() {
  const payload = await getPayload({ config: configPromise });

  const active = await payload.find({ collection: "championships", where: { isActive: { equals: true } }, limit: 1, depth: 0 });
  const championship = active.docs[0];
  if (!championship) return NextResponse.json({ error: "No active championship" }, { status: 404 });

  const [posts, log] = await Promise.all([
    payload.find({
      collection: "live-blog-posts",
      where: { championship: { equals: championship.id } },
      sort: "postedAt",
      limit: 1000,
      depth: 0,
    }),
    payload.find({
      collection: "live-blog-trigger-log",
      where: { championship: { equals: championship.id } },
      sort: "evaluatedAt",
      limit: 2000,
      depth: 0,
    }),
  ]);

  const postsByCategory: Record<string, number> = {};
  const postsByCompetition: Record<string, number> = {};
  for (const p of posts.docs) {
    postsByCategory[p.category] = (postsByCategory[p.category] ?? 0) + 1;
    const comp = p.competition ?? "(none)";
    postsByCompetition[comp] = (postsByCompetition[comp] ?? 0) + 1;
  }

  const candidatesByCategory: Record<string, { total: number; selected: number; suppressed: number; reasons: Record<string, number> }> = {};
  for (const l of log.docs) {
    const cat = l.category;
    if (!candidatesByCategory[cat]) candidatesByCategory[cat] = { total: 0, selected: 0, suppressed: 0, reasons: {} };
    candidatesByCategory[cat].total++;
    if (l.selected) candidatesByCategory[cat].selected++;
    if (l.suppressed) {
      candidatesByCategory[cat].suppressed++;
      const reason = l.suppressionReason ?? "(pre-decision)";
      candidatesByCategory[cat].reasons[reason] = (candidatesByCategory[cat].reasons[reason] ?? 0) + 1;
    }
  }

  const suppressionReasonTotals: Record<string, number> = {};
  for (const l of log.docs) {
    if (l.suppressed) {
      const reason = l.suppressionReason ?? "(pre-decision)";
      suppressionReasonTotals[reason] = (suppressionReasonTotals[reason] ?? 0) + 1;
    }
  }

  return NextResponse.json({
    championshipId: championship.id,
    championshipYear: championship.year,
    totalPublishedPosts: posts.totalDocs,
    totalCandidatesEvaluated: log.totalDocs,
    postsByCategory,
    postsByCompetition,
    candidatesByCategory,
    suppressionReasonTotals,
    firstPostAt: posts.docs[0]?.postedAt,
    lastPostAt: posts.docs[posts.docs.length - 1]?.postedAt,
  });
}
