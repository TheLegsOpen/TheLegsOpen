import type { Metadata } from "next";

import { PageHero } from "@/components/shared/page-hero";
import { ChampionshipWeekSwitcher } from "@/components/shared/championship-week-switcher";
import { LeaderboardView } from "@/components/leaderboard/leaderboard-view";
import { getLeaderboard } from "@/lib/data/leaderboard";
import { getArticles } from "@/lib/data/articles";
import { getSponsorClock } from "@/lib/data/sponsor-clock";
import { getStatCategories } from "@/lib/data/statistics";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "Full leaderboard and scoring for The Legs Open.",
};

export default async function LeaderboardPage() {
  const [round2, round4, articles, clockConfig, statCategories] = await Promise.all([
    getLeaderboard("round2"),
    getLeaderboard("round4"),
    getArticles(),
    getSponsorClock(),
    getStatCategories(),
  ]);

  return (
    <>
      <PageHero
        variant="photo"
        imageLabel="Callum Reith celebrates on the 18th green"
        eyebrow="Championship Week"
        title="Leaderboard"
        description="Live scoring from Seabrook Old Course. Star a player to follow them throughout the week."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Leaderboard" }]}
      />
      <ChampionshipWeekSwitcher />
      <LeaderboardView
        round2={round2}
        round4={round4}
        featuredArticle={articles[0]}
        articles={articles}
        statCategories={statCategories}
        clockConfig={clockConfig}
      />
    </>
  );
}
