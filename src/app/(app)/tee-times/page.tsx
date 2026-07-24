import type { Metadata } from "next";

import { PageHero } from "@/components/shared/page-hero";
import { ChampionshipWeekSwitcher } from "@/components/shared/championship-week-switcher";
import { TeeTimesView } from "@/components/tee-times/tee-times-view";
import { getTeeTimes } from "@/lib/data/tee-times";
import { getArticles } from "@/lib/data/articles";
import { getSponsorClock } from "@/lib/data/sponsor-clock";

export const metadata: Metadata = {
  title: "Tee Times",
  description: "Round-by-round tee times for The Legs Open at Seabrook Old Course.",
};

export default async function TeeTimesPage() {
  const [rounds, articles, clockConfig] = await Promise.all([getTeeTimes(), getArticles(), getSponsorClock()]);

  return (
    <>
      <PageHero
        variant="photo"
        imageLabel="Practice range at first light"
        eyebrow="Championship Week"
        title="Tee times"
        description="Starting times for every round, grouped by day. Star a player on the leaderboard to see them highlighted here."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Tee Times" }]}
      />
      <ChampionshipWeekSwitcher />
      <TeeTimesView rounds={rounds} featuredArticle={articles[0]} clockConfig={clockConfig} />
    </>
  );
}
