import type { Metadata } from "next";

import { PageHero } from "@/components/shared/page-hero";
import { ChampionshipWeekSwitcher } from "@/components/shared/championship-week-switcher";
import { TeeTimesView } from "@/components/tee-times/tee-times-view";
import { getTeeTimes } from "@/lib/data/tee-times";
import { getArticles } from "@/lib/data/articles";
import { getSponsorClock } from "@/lib/data/sponsor-clock";
import { getPageBanners } from "@/lib/data/page-banners";
import { getCompetitionLeaderboard } from "@/lib/data/scorecards";
import { getNettScoringCategories, getScratchScoringCategories, getStreakCategories } from "@/lib/data/scoring-statistics";

export const metadata: Metadata = {
  title: "Tee Times",
  description: "Round-by-round tee times for The Legs Open at Seabrook Old Course.",
};

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
      />
    </>
  );
}
