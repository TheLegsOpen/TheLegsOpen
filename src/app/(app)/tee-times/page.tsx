import type { Metadata } from "next";

import { PageHero } from "@/components/shared/page-hero";
import { ChampionshipWeekSwitcher } from "@/components/shared/championship-week-switcher";
import { TeeTimesView } from "@/components/tee-times/tee-times-view";
import { getTeeTimes } from "@/lib/data/tee-times";
import { getArticles } from "@/lib/data/articles";
import { getSponsorClock } from "@/lib/data/sponsor-clock";
import { getPageBanners } from "@/lib/data/page-banners";
import { getCompetitionLeaderboard } from "@/lib/data/scorecards";
import {
  getNettScoringCategories,
  getScratchScoringCategories,
  getStreakCategories,
  getDrivingCategories,
  getApproachCategories,
  getPuttingCategories,
} from "@/lib/data/scoring-statistics";

export const metadata: Metadata = {
  title: "Tee Times",
  description: "Round-by-round tee times for The Legs Open at Seabrook Old Course.",
};

// Same hard ceiling on ISR staleness as the homepage/leaderboard -- see the comment on
// src/app/(app)/page.tsx's own `revalidate` for why on-demand revalidation alone isn't enough
// (per-hostname edge cache can sit stale far longer on a low-traffic custom domain). This page
// shows live per-hole "thru" progress during a round, so it needs the same guarantee.
export const revalidate = 10;

export default async function TeeTimesPage() {
  const [
    rounds,
    articles,
    clockConfig,
    banners,
    mainEntries,
    stablefordEntries,
    scratchEntries,
    nettCategories,
    scratchCategories,
    streakCategories,
    drivingCategories,
    approachCategories,
    puttingCategories,
  ] = await Promise.all([
    getTeeTimes(),
    getArticles(),
    getSponsorClock(),
    getPageBanners(),
    getCompetitionLeaderboard("main"),
    getCompetitionLeaderboard("stableford"),
    getCompetitionLeaderboard("scratch"),
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
        imageLabel="Practice range at first light"
        imageUrl={banners.teeTimesUrl}
        eyebrow={banners.teeTimesEyebrow}
        title={banners.teeTimesTitle}
        description={banners.teeTimesDescription}
      />
      <ChampionshipWeekSwitcher />
      <TeeTimesView
        rounds={rounds}
        featuredArticle={articles[0]}
        clockConfig={clockConfig}
        mainEntries={mainEntries}
        stablefordEntries={stablefordEntries}
        scratchEntries={scratchEntries}
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
