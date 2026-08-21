import type { Metadata } from "next";

import { PageHero } from "@/components/shared/page-hero";
import { ChampionshipWeekSwitcher } from "@/components/shared/championship-week-switcher";
import { Container } from "@/components/shared/container";
import { ChampionshipSidebar } from "@/components/shared/championship-sidebar";
import { LiveBlogFeed } from "@/components/live-blog/live-blog-feed";
import { getLiveBlogPosts } from "@/lib/data/live-blog";
import { getArticles } from "@/lib/data/articles";
import { getSponsorClock } from "@/lib/data/sponsor-clock";
import { getCompetitionLeaderboard } from "@/lib/data/scorecards";
import { getPageBanners } from "@/lib/data/page-banners";
import { getSiteTheme } from "@/lib/data/site-theme";
import {
  getNettScoringCategories,
  getScratchScoringCategories,
  getStreakCategories,
  getDrivingCategories,
  getApproachCategories,
  getPuttingCategories,
} from "@/lib/data/scoring-statistics";
import { getSeoSettings } from "@/lib/data/seo-settings";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoSettings();
  return { title: seo.liveBlog.title, description: seo.liveBlog.description };
}

// See the comment on this same export in src/app/(app)/page.tsx -- raised from 10s now that the
// per-hostname cache-splitting bug it worked around is fixed at the root (the domain redirect),
// and Supabase egress makes a 10s ceiling on a high-traffic page expensive to keep regardless.
export const revalidate = 60;

export default async function LiveBlogPage() {
  const [
    liveBlogPage,
    articles,
    clockConfig,
    banners,
    theme,
    mainEntries,
    stablefordEntries,
    scratchEntries,
    nettCategories,
    scratchCategories,
    streakCategories,
    drivingCategories,
    approachCategories,
    puttingCategories,
  ] = await Promise.all([
    getLiveBlogPosts(),
    getArticles(),
    getSponsorClock(),
    getPageBanners(),
    getSiteTheme(),
    getCompetitionLeaderboard("main"),
    getCompetitionLeaderboard("stableford"),
    getCompetitionLeaderboard("scratch"),
    getNettScoringCategories(),
    getScratchScoringCategories(),
    getStreakCategories(),
    getDrivingCategories(),
    getApproachCategories(),
    getPuttingCategories(),
  ]);

  return (
    <>
      <PageHero
        variant="photo"
        size="compact"
        imageLabel="Gallery watching on the 18th at Seabrook Old Course"
        imageUrl={banners.liveBlogUrl}
        eyebrow={banners.liveBlogEyebrow}
        title={banners.liveBlogTitle}
        description={banners.liveBlogDescription}
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Live Blog" }]}
      />
      <ChampionshipWeekSwitcher />

      <div className="bg-[#EEEEEE]">
        <Container className="grid grid-cols-1 gap-10 py-12 sm:py-16 lg:grid-cols-[1fr_320px] lg:items-start">
          <LiveBlogFeed
            initialEntries={liveBlogPage.entries}
            initialHasNextPage={liveBlogPage.hasNextPage}
            realtimeChampionshipId={liveBlogPage.championshipId}
            mainEntries={mainEntries}
            stablefordEntries={stablefordEntries}
            scratchEntries={scratchEntries}
            nettCategories={nettCategories}
            scratchCategories={scratchCategories}
            streakCategories={streakCategories}
            drivingCategories={drivingCategories}
            approachCategories={approachCategories}
            puttingCategories={puttingCategories}
            logoUrl={theme.logoUrl}
          />
          <ChampionshipSidebar featuredArticle={articles[0]} clockConfig={clockConfig} tone="dark" />
        </Container>
      </div>
    </>
  );
}
