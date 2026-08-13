import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/shared/container";
import { PageHero } from "@/components/shared/page-hero";
import { PreviousOpenView, type PreviousOpenResults } from "@/components/previous-opens/previous-open-view";
import { formatDate } from "@/lib/utils";
import { getAllChampionshipYears, getChampionshipByYear } from "@/lib/data/championships";
import { computeAutoFacts } from "@/lib/data/records";
import { getCompetitionLeaderboardForChampionshipId } from "@/lib/data/scorecards";
import { getPlayoffs, applyPlayoffToEntries } from "@/lib/data/playoffs";
import { getTeeTimesForChampionshipId } from "@/lib/data/tee-times";
import { getLiveBlogPosts } from "@/lib/data/live-blog";
import { getArticles } from "@/lib/data/articles";
import { getSponsorClock } from "@/lib/data/sponsor-clock";
import {
  getNettScoringCategories,
  getScratchScoringCategories,
  getStreakCategories,
  getDrivingCategories,
  getApproachCategories,
  getPuttingCategories,
  getToughestHoles,
} from "@/lib/data/scoring-statistics";

interface YearPageProps {
  params: Promise<{ year: string }>;
}

export async function generateStaticParams() {
  const years = await getAllChampionshipYears();
  return years.map((year) => ({ year }));
}

export async function generateMetadata({ params }: YearPageProps): Promise<Metadata> {
  const { year } = await params;
  const championship = await getChampionshipByYear(Number(year));
  if (!championship) return {};
  return {
    title: `${championship.year} — ${championship.venueName}`,
    description: championship.winnerName
      ? `${championship.winnerName} won the ${championship.year} Legs Open at ${championship.venueName}.`
      : `The ${championship.year} Legs Open at ${championship.venueName}.`,
  };
}

/** Full results (Leaderboard/Tee Times/Statistics/Live Blog) only get fetched once a championship is marked Completed -- until then Results shows a "not yet recorded" state, matching a year that only has roll-of-honour data. */
async function loadResults(championshipId: string): Promise<PreviousOpenResults> {
  const [
    mainRaw,
    stablefordRaw,
    scratchRaw,
    playoffs,
    rounds,
    nettCategories,
    scratchCategories,
    streakCategories,
    drivingCategories,
    approachCategories,
    puttingCategories,
    toughestHolesNett,
    toughestHolesScratch,
    liveBlogPage,
    articles,
    clockConfig,
  ] = await Promise.all([
    getCompetitionLeaderboardForChampionshipId(championshipId, "main"),
    getCompetitionLeaderboardForChampionshipId(championshipId, "stableford"),
    getCompetitionLeaderboardForChampionshipId(championshipId, "scratch"),
    getPlayoffs(championshipId),
    getTeeTimesForChampionshipId(championshipId),
    getNettScoringCategories(championshipId),
    getScratchScoringCategories(championshipId),
    getStreakCategories(championshipId),
    getDrivingCategories(championshipId),
    getApproachCategories(championshipId),
    getPuttingCategories(championshipId),
    getToughestHoles("nett", championshipId),
    getToughestHoles("scratch", championshipId),
    getLiveBlogPosts(1, undefined, championshipId),
    getArticles(),
    getSponsorClock(),
  ]);

  return {
    main: applyPlayoffToEntries(mainRaw, playoffs.find((p) => p.competition === "main")),
    stableford: applyPlayoffToEntries(stablefordRaw, playoffs.find((p) => p.competition === "stableford")),
    scratch: applyPlayoffToEntries(scratchRaw, playoffs.find((p) => p.competition === "scratch")),
    rounds,
    nettCategories,
    scratchCategories,
    streakCategories,
    drivingCategories,
    approachCategories,
    puttingCategories,
    toughestHolesNett,
    toughestHolesScratch,
    playoffs,
    liveBlogPage,
    featuredArticle: articles[0],
    clockConfig,
  };
}

export default async function PreviousOpenYearPage({ params }: YearPageProps) {
  const { year } = await params;
  const championship = await getChampionshipByYear(Number(year));
  if (!championship) notFound();

  const [autoFacts, results] = await Promise.all([
    computeAutoFacts(championship),
    championship.completed ? loadResults(championship.id) : Promise.resolve(undefined),
  ]);

  return (
    <>
      <PageHero
        variant="photo"
        imageUrl={championship.winnerPhotoUrl}
        imageLabel={championship.winnerName ? `${championship.winnerName} at ${championship.venueName}` : championship.venueName}
        eyebrow={championship.date ? formatDate(championship.date) : String(championship.year)}
        title={championship.venueName}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Previous Opens", href: "/previous-opens" },
          { label: String(championship.year) },
        ]}
      />
      <Container className="flex flex-col gap-10 py-10 sm:py-14">
        <PreviousOpenView championship={championship} autoFacts={autoFacts} results={results} />
      </Container>
    </>
  );
}
