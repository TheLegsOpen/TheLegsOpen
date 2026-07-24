import type { Metadata } from "next";

import { PageHero } from "@/components/shared/page-hero";
import { ChampionshipWeekSwitcher } from "@/components/shared/championship-week-switcher";
import { Container } from "@/components/shared/container";
import { ChampionshipSidebar } from "@/components/shared/championship-sidebar";
import { StatCategoryCard } from "@/components/statistics/stat-category-card";
import { getArticles } from "@/lib/data/articles";
import { getStatCategories } from "@/lib/data/statistics";

export const metadata: Metadata = {
  title: "Statistics",
  description: "Driving distance, greens in regulation, putting and scoring statistics for The Legs Open.",
};

export default async function StatisticsPage() {
  const [categories, articles] = await Promise.all([getStatCategories(), getArticles()]);

  return (
    <>
      <PageHero
        variant="photo"
        imageLabel="Practice range at Seabrook Old Course"
        eyebrow="Championship Week"
        title="Statistics"
        description="Driving distance, greens in regulation, putting and scoring across the field."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Statistics" }]}
      />
      <ChampionshipWeekSwitcher />

      <div className="bg-surface-dark bg-dashboard-pattern text-surface-dark-foreground">
        <Container className="grid grid-cols-1 gap-10 py-12 sm:py-16 lg:grid-cols-[1fr_320px] lg:items-start">
          <div className="flex flex-col gap-8">
            {categories.map((category) => (
              <StatCategoryCard key={category.key} category={category} />
            ))}
          </div>
          <ChampionshipSidebar featuredArticle={articles[0]} tone="dark" />
        </Container>
      </div>
    </>
  );
}
