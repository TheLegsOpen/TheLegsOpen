import type { Metadata } from "next";

import { PageHero } from "@/components/shared/page-hero";
import { ChampionshipWeekSwitcher } from "@/components/shared/championship-week-switcher";
import { Container } from "@/components/shared/container";
import { ChampionshipSidebar } from "@/components/shared/championship-sidebar";
import { StatPreviewBoard } from "@/components/statistics/stat-preview-board";
import { getArticles } from "@/lib/data/articles";
import {
  getNettScoringCategories,
  getScratchScoringCategories,
  getStreakCategories,
  getDrivingCategories,
  getApproachCategories,
  getPuttingCategories,
  getToughestHoles,
} from "@/lib/data/scoring-statistics";
import { getSponsorClock } from "@/lib/data/sponsor-clock";
import { getPageBanners } from "@/lib/data/page-banners";
import { getPlayoffs } from "@/lib/data/playoffs";
import { getCompetitionLeaderboard } from "@/lib/data/scorecards";

export const metadata: Metadata = {
  title: "Statistics",
  description: "Nett and Scratch scoring statistics by hole par for The Legs Open.",
};

// See the comment on src/app/(app)/page.tsx's own `revalidate` -- raised from 10s now that the
// per-hostname cache-splitting bug it worked around is fixed at the root (the domain redirect),
// and Supabase egress makes a 10s ceiling expensive to keep regardless. These rankings change on
// every hole saved during a round, and stay accurate via on-demand revalidation either way.
export const revalidate = 60;

export default async function StatisticsPage() {
  const [
    nettScoring,
    scratchScoring,
    streaks,
    driving,
    approach,
    putting,
    toughestHolesNett,
    toughestHolesScratch,
    playoffs,
    articles,
    clockConfig,
    banners,
    mainEntries,
    stablefordEntries,
    scratchEntries,
  ] = await Promise.all([
    getNettScoringCategories(),
    getScratchScoringCategories(),
    getStreakCategories(),
    getDrivingCategories(),
    getApproachCategories(),
    getPuttingCategories(),
    getToughestHoles("nett"),
    getToughestHoles("scratch"),
    getPlayoffs(),
    getArticles(),
    getSponsorClock(),
    getPageBanners(),
    getCompetitionLeaderboard("main"),
    getCompetitionLeaderboard("stableford"),
    getCompetitionLeaderboard("scratch"),
  ]);

  return (
    <>
      <PageHero
        variant="photo"
        size="compact"
        imageLabel="Practice range at Seabrook Old Course"
        imageUrl={banners.statisticsUrl}
        eyebrow={banners.statisticsEyebrow}
        title={banners.statisticsTitle}
        description={banners.statisticsDescription}
      />
      <ChampionshipWeekSwitcher />

      <div className="bg-surface-dark text-surface-dark-foreground">
        <Container className="grid grid-cols-1 gap-10 py-12 sm:py-16 lg:grid-cols-[1fr_320px] lg:items-start">
          <StatPreviewBoard
            nettCategories={nettScoring}
            scratchCategories={scratchScoring}
            streakCategories={streaks}
            drivingCategories={driving}
            approachCategories={approach}
            puttingCategories={putting}
            toughestHolesNett={toughestHolesNett}
            toughestHolesScratch={toughestHolesScratch}
            playoffs={playoffs}
            mainEntries={mainEntries}
            stablefordEntries={stablefordEntries}
            scratchEntries={scratchEntries}
          />
          <ChampionshipSidebar featuredArticle={articles[0]} clockConfig={clockConfig} tone="dark" />
        </Container>
      </div>
    </>
  );
}
