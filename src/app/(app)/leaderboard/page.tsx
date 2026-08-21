import type { Metadata } from "next";

import { PageHero } from "@/components/shared/page-hero";
import { ChampionshipWeekSwitcher } from "@/components/shared/championship-week-switcher";
import { LeaderboardView } from "@/components/leaderboard/leaderboard-view";
import { getCompetitionLeaderboard } from "@/lib/data/scorecards";
import { getArticles } from "@/lib/data/articles";
import { getSponsorClock } from "@/lib/data/sponsor-clock";
import { getPageBanners } from "@/lib/data/page-banners";
import {
  getNettScoringCategories,
  getScratchScoringCategories,
  getStreakCategories,
  getDrivingCategories,
  getApproachCategories,
  getPuttingCategories,
} from "@/lib/data/scoring-statistics";
import { getPlayoffs, applyPlayoffToEntries, getEligibleStablefordChampion } from "@/lib/data/playoffs";
import { getSeoSettings } from "@/lib/data/seo-settings";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoSettings();
  return { title: seo.leaderboard.title, description: seo.leaderboard.description };
}

// See the comment on this same export in src/app/(app)/page.tsx -- raised from 10s now that the
// per-hostname cache-splitting bug it worked around is fixed at the root (the domain redirect),
// and Supabase egress makes a 10s ceiling on a high-traffic page expensive to keep regardless.
export const revalidate = 60;

export default async function LeaderboardPage() {
  const [
    mainRaw,
    stablefordRaw,
    scratchRaw,
    articles,
    clockConfig,
    banners,
    nettCategories,
    scratchCategories,
    streakCategories,
    drivingCategories,
    approachCategories,
    puttingCategories,
    playoffs,
  ] = await Promise.all([
    getCompetitionLeaderboard("main"),
    getCompetitionLeaderboard("stableford"),
    getCompetitionLeaderboard("scratch"),
    getArticles(),
    getSponsorClock(),
    getPageBanners(),
    getNettScoringCategories(),
    getScratchScoringCategories(),
    getStreakCategories(),
    getDrivingCategories(),
    getApproachCategories(),
    getPuttingCategories(),
    getPlayoffs(),
  ]);

  const main = applyPlayoffToEntries(mainRaw, playoffs.find((p) => p.competition === "main"));
  const stableford = applyPlayoffToEntries(stablefordRaw, playoffs.find((p) => p.competition === "stableford"));
  const scratch = applyPlayoffToEntries(scratchRaw, playoffs.find((p) => p.competition === "scratch"));
  const stablefordTitleHolderId = getEligibleStablefordChampion(main, stableford)?.player.id;

  return (
    <>
      <PageHero
        variant="photo"
        size="compact"
        imageLabel="Callum Reith celebrates on the 18th green"
        imageUrl={banners.leaderboardUrl}
        eyebrow={banners.leaderboardEyebrow}
        title={banners.leaderboardTitle}
        description={banners.leaderboardDescription}
      />
      <ChampionshipWeekSwitcher />
      <LeaderboardView
        main={main}
        stableford={stableford}
        scratch={scratch}
        featuredArticle={articles[0]}
        clockConfig={clockConfig}
        nettCategories={nettCategories}
        scratchCategories={scratchCategories}
        streakCategories={streakCategories}
        drivingCategories={drivingCategories}
        approachCategories={approachCategories}
        puttingCategories={puttingCategories}
        stablefordTitleHolderId={stablefordTitleHolderId}
      />
    </>
  );
}
