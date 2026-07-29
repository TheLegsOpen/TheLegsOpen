import type { Metadata } from "next";

import { PageHero } from "@/components/shared/page-hero";
import { ChampionshipWeekSwitcher } from "@/components/shared/championship-week-switcher";
import { Container } from "@/components/shared/container";
import { ChampionshipSidebar } from "@/components/shared/championship-sidebar";
import { StatPreviewBoard } from "@/components/statistics/stat-preview-board";
import { getArticles } from "@/lib/data/articles";
import { getNettScoringCategories, getScratchScoringCategories, getStreakCategories } from "@/lib/data/scoring-statistics";
import { getSponsorClock } from "@/lib/data/sponsor-clock";
import { getPageBanners } from "@/lib/data/page-banners";

export const metadata: Metadata = {
  title: "Statistics",
  description: "Nett and Scratch scoring statistics by hole par for The Legs Open.",
};

export default async function StatisticsPage() {
  const [nettScoring, scratchScoring, streaks, articles, clockConfig, banners] = await Promise.all([
    getNettScoringCategories(),
    getScratchScoringCategories(),
    getStreakCategories(),
    getArticles(),
    getSponsorClock(),
    getPageBanners(),
  ]);

  return (
    <>
      <PageHero
        variant="photo"
        imageLabel="Practice range at Seabrook Old Course"
        imageUrl={banners.statisticsUrl}
        eyebrow={banners.statisticsEyebrow}
        title={banners.statisticsTitle}
        description={banners.statisticsDescription}
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Statistics" }]}
      />
      <ChampionshipWeekSwitcher />

      <div className="bg-surface-dark bg-dashboard-pattern text-surface-dark-foreground">
        <Container className="grid grid-cols-1 gap-10 py-12 sm:py-16 lg:grid-cols-[1fr_320px] lg:items-start">
          <StatPreviewBoard nettCategories={nettScoring} scratchCategories={scratchScoring} streakCategories={streaks} />
          <ChampionshipSidebar featuredArticle={articles[0]} clockConfig={clockConfig} tone="dark" />
        </Container>
      </div>
    </>
  );
}
