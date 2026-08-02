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

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "Live scoring for The Legs Open — Main, Stableford and Scratch competitions.",
};

export default async function LeaderboardPage() {
  const [
    main,
    stableford,
    scratch,
    articles,
    clockConfig,
    banners,
    nettCategories,
    scratchCategories,
    streakCategories,
    drivingCategories,
    approachCategories,
    puttingCategories,
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
  ]);

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
      />
    </>
  );
}
