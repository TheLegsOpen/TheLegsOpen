import { NextRequest, NextResponse } from "next/server";

import {
  getNettScoringCategories,
  getScratchScoringCategories,
  getStreakCategories,
  getDrivingCategories,
  getApproachCategories,
  getPuttingCategories,
} from "@/lib/data/scoring-statistics";

/**
 * Powers the Stats tab's per-year picker on player profiles -- lazy on-demand rather than
 * precomputed for every year on every player page, since these six category functions each
 * independently re-query scorecards/venue and rank the *whole field*, so precomputing every year
 * for every player would redundantly recompute the same year-wide rankings once per player.
 * Returns the same public per-event data /previous-opens/[year] already serves for that year, so
 * no player-specific gating is needed -- only championshipId validity matters.
 */
export async function GET(request: NextRequest) {
  const championshipId = request.nextUrl.searchParams.get("championshipId");
  if (!championshipId) {
    return NextResponse.json({ error: "championshipId required" }, { status: 400 });
  }

  const [nettCategories, scratchCategories, streakCategories, drivingCategories, approachCategories, puttingCategories] = await Promise.all([
    getNettScoringCategories(championshipId),
    getScratchScoringCategories(championshipId),
    getStreakCategories(championshipId),
    getDrivingCategories(championshipId),
    getApproachCategories(championshipId),
    getPuttingCategories(championshipId),
  ]);

  return NextResponse.json({ nettCategories, scratchCategories, streakCategories, drivingCategories, approachCategories, puttingCategories });
}
