import type { Metadata } from "next";

import { PageHero } from "@/components/shared/page-hero";
import { ChampionshipWeekSwitcher } from "@/components/shared/championship-week-switcher";
import { LeaderboardView } from "@/components/leaderboard/leaderboard-view";
import { getLeaderboard } from "@/lib/data/leaderboard";
import { getArticles } from "@/lib/data/articles";
import { getSponsorClock } from "@/lib/data/sponsor-clock";
import { getStatCategories } from "@/lib/data/statistics";
import { getCompetitionComplete } from "@/lib/data/tournament-status";
import { getPageBanners } from "@/lib/data/page-banners";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "Full leaderboard and scoring for The Legs Open.",
};

export default async function LeaderboardPage() {
  const [round2, round4, articles, clockConfig, statCategories, competitionComplete, banners] = await Promise.all([
    getLeaderboard("round2"),
    getLeaderboard("round4"),
    getArticles(),
    getSponsorClock(),
    getStatCategories(),
    getCompetitionComplete(),
    getPageBanners(),
  ]);

  return (
    <>
      <PageHero
        variant="photo"
        imageLabel="Callum Reith celebrates on the 18th green"
        imageUrl={banners.leaderboardUrl}
        eyebrow={banners.leaderboardEyebrow}
        title={banners.leaderboardTitle}
        description={banners.leaderboardDescription}
      />
      <ChampionshipWeekSwitcher />
      <LeaderboardView
        round2={round2}
        round4={round4}
        featuredArticle={articles[0]}
        articles={articles}
        statCategories={statCategories}
        clockConfig={clockConfig}
        competitionComplete={competitionComplete}
      />
    </>
  );
}
