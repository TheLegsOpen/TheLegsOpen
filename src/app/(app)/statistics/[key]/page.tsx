import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHero } from "@/components/shared/page-hero";
import { ChampionshipWeekSwitcher } from "@/components/shared/championship-week-switcher";
import { Container } from "@/components/shared/container";
import { ChampionshipSidebar } from "@/components/shared/championship-sidebar";
import { StatExplorer } from "@/components/statistics/stat-explorer";
import { getArticles } from "@/lib/data/articles";
import {
  getNettScoringCategories,
  getScratchScoringCategories,
  getStreakCategories,
  getDrivingCategories,
  getApproachCategories,
  getPuttingCategories,
} from "@/lib/data/scoring-statistics";
import { getSponsorClock } from "@/lib/data/sponsor-clock";
import { getPageBanners } from "@/lib/data/page-banners";

interface StatDetailPageProps {
  params: Promise<{ key: string }>;
}

export async function generateMetadata({ params }: StatDetailPageProps): Promise<Metadata> {
  const { key } = await params;
  const [nettScoring, scratchScoring, streaks, driving, approach, putting] = await Promise.all([
    getNettScoringCategories(),
    getScratchScoringCategories(),
    getStreakCategories(),
    getDrivingCategories(),
    getApproachCategories(),
    getPuttingCategories(),
  ]);
  const category = [...nettScoring, ...scratchScoring, ...streaks, ...driving, ...approach, ...putting].find((c) => c.key === key);
  return {
    title: category ? `${category.title} | Statistics` : "Statistics",
    description: "Full rankings computed live from every player's scorecard.",
  };
}

export default async function StatDetailPage({ params }: StatDetailPageProps) {
  const { key } = await params;
  const [nettScoring, scratchScoring, streaks, driving, approach, putting, articles, clockConfig, banners] = await Promise.all([
    getNettScoringCategories(),
    getScratchScoringCategories(),
    getStreakCategories(),
    getDrivingCategories(),
    getApproachCategories(),
    getPuttingCategories(),
    getArticles(),
    getSponsorClock(),
    getPageBanners(),
  ]);

  const category = [...nettScoring, ...scratchScoring, ...streaks, ...driving, ...approach, ...putting].find((c) => c.key === key);
  if (!category) notFound();

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

      <div className="bg-surface-dark bg-dashboard-pattern text-surface-dark-foreground">
        <Container className="grid grid-cols-1 gap-10 py-12 sm:py-16 lg:grid-cols-[1fr_320px] lg:items-start">
          <StatExplorer
            nettCategories={nettScoring}
            scratchCategories={scratchScoring}
            streakCategories={streaks}
            drivingCategories={driving}
            approachCategories={approach}
            puttingCategories={putting}
            initialKey={key}
          />
          <ChampionshipSidebar featuredArticle={articles[0]} clockConfig={clockConfig} tone="dark" />
        </Container>
      </div>
    </>
  );
}
