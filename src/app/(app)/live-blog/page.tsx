import type { Metadata } from "next";

import { PageHero } from "@/components/shared/page-hero";
import { ChampionshipWeekSwitcher } from "@/components/shared/championship-week-switcher";
import { Container } from "@/components/shared/container";
import { ChampionshipSidebar } from "@/components/shared/championship-sidebar";
import { LiveBlogFeed } from "@/components/live-blog/live-blog-feed";
import { getLiveBlogPosts } from "@/lib/data/live-blog";
import { getArticles } from "@/lib/data/articles";
import { getSponsorClock } from "@/lib/data/sponsor-clock";

export const metadata: Metadata = {
  title: "Live Blog",
  description: "Live updates from The Legs Open — birdies, bogeys and lead changes as they happen.",
};

export default async function LiveBlogPage() {
  const [entries, articles, clockConfig] = await Promise.all([getLiveBlogPosts(), getArticles(), getSponsorClock()]);

  return (
    <>
      <PageHero
        variant="photo"
        size="compact"
        imageLabel="Gallery watching on the 18th at Seabrook Old Course"
        eyebrow="Championship Week"
        title="Live Blog"
        description="Every notable moment from the course, as it happens."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Live Blog" }]}
      />
      <ChampionshipWeekSwitcher />

      <div className="bg-[#EEEEEE]">
        <Container className="grid grid-cols-1 gap-10 py-12 sm:py-16 lg:grid-cols-[1fr_320px] lg:items-start">
          <LiveBlogFeed entries={entries} />
          <ChampionshipSidebar featuredArticle={articles[0]} clockConfig={clockConfig} tone="dark" />
        </Container>
      </div>
    </>
  );
}
