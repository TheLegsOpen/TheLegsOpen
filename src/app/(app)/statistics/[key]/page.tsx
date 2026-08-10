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
import { getCompetitionLeaderboard, getCompetitionLeaderboardForChampionshipId } from "@/lib/data/scorecards";
import { getChampionshipByYear } from "@/lib/data/championships";
import type { Competition, CompetitionEntry } from "@/lib/data/scorecards";

interface StatDetailPageProps {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ year?: string }>;
}

/** Resolves a specific past championship's leaderboard when `?year=` is present (e.g. linked from Previous Opens' Statistics tab), otherwise the active one -- same fallback pattern as the category-fetch functions below. */
async function resolveLeaderboard(competition: Competition, championshipId: string | undefined): Promise<CompetitionEntry[]> {
  return championshipId ? getCompetitionLeaderboardForChampionshipId(championshipId, competition) : getCompetitionLeaderboard(competition);
}

export async function generateMetadata({ params, searchParams }: StatDetailPageProps): Promise<Metadata> {
  const { key } = await params;
  const { year } = await searchParams;
  const championship = year ? await getChampionshipByYear(Number(year)) : undefined;
  const [nettScoring, scratchScoring, streaks, driving, approach, putting] = await Promise.all([
    getNettScoringCategories(championship?.id),
    getScratchScoringCategories(championship?.id),
    getStreakCategories(championship?.id),
    getDrivingCategories(championship?.id),
    getApproachCategories(championship?.id),
    getPuttingCategories(championship?.id),
  ]);
  const category = [...nettScoring, ...scratchScoring, ...streaks, ...driving, ...approach, ...putting].find((c) => c.key === key);
  return {
    title: category ? `${category.title} | Statistics` : "Statistics",
    description: "Full rankings computed live from every player's scorecard.",
  };
}

export default async function StatDetailPage({ params, searchParams }: StatDetailPageProps) {
  const { key } = await params;
  const { year } = await searchParams;
  const championship = year ? await getChampionshipByYear(Number(year)) : undefined;
  const [
    nettScoring,
    scratchScoring,
    streaks,
    driving,
    approach,
    putting,
    articles,
    clockConfig,
    banners,
    mainEntries,
    stablefordEntries,
    scratchEntries,
  ] = await Promise.all([
    getNettScoringCategories(championship?.id),
    getScratchScoringCategories(championship?.id),
    getStreakCategories(championship?.id),
    getDrivingCategories(championship?.id),
    getApproachCategories(championship?.id),
    getPuttingCategories(championship?.id),
    getArticles(),
    getSponsorClock(),
    getPageBanners(),
    resolveLeaderboard("main", championship?.id),
    resolveLeaderboard("stableford", championship?.id),
    resolveLeaderboard("scratch", championship?.id),
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

      <div className="bg-surface-dark text-surface-dark-foreground">
        <Container className="grid grid-cols-1 gap-10 py-12 sm:py-16 lg:grid-cols-[1fr_320px] lg:items-start">
          <StatExplorer
            nettCategories={nettScoring}
            scratchCategories={scratchScoring}
            streakCategories={streaks}
            drivingCategories={driving}
            approachCategories={approach}
            puttingCategories={putting}
            initialKey={key}
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
