import type { Metadata } from "next";

import { PageHero } from "@/components/shared/page-hero";
import { ChampionshipWeekSwitcher } from "@/components/shared/championship-week-switcher";
import { Container } from "@/components/shared/container";
import { ChampionshipSidebar } from "@/components/shared/championship-sidebar";
import { StatExplorer } from "@/components/statistics/stat-explorer";
import { getArticles } from "@/lib/data/articles";
import { getNettScoringCategories } from "@/lib/data/scoring-statistics";
import { getSponsorClock } from "@/lib/data/sponsor-clock";

export const metadata: Metadata = {
  title: "Statistics",
  description: "Nett scoring statistics by hole par for The Legs Open.",
};

export default async function StatisticsPage() {
  const [nettScoring, articles, clockConfig] = await Promise.all([getNettScoringCategories(), getArticles(), getSponsorClock()]);

  return (
    <>
      <PageHero
        variant="photo"
        imageLabel="Practice range at Seabrook Old Course"
        eyebrow="Championship Week"
        title="Statistics"
        description="Scoring statistics computed live from every player's scorecard."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Statistics" }]}
      />
      <ChampionshipWeekSwitcher />

      <div className="bg-surface-dark bg-dashboard-pattern text-surface-dark-foreground">
        <Container className="grid grid-cols-1 gap-10 py-12 sm:py-16 lg:grid-cols-[1fr_320px] lg:items-start">
          <StatExplorer categories={nettScoring} />
          <ChampionshipSidebar featuredArticle={articles[0]} clockConfig={clockConfig} tone="dark" />
        </Container>
      </div>
    </>
  );
}
