import type { Metadata } from "next";

import { PageHero } from "@/components/shared/page-hero";
import { ChampionshipWeekSwitcher } from "@/components/shared/championship-week-switcher";
import { ChampionshipSidebar } from "@/components/shared/championship-sidebar";
import { LiveBlogFeed } from "@/components/live-blog/live-blog-feed";
import { getLiveBlogPosts, getLiveBlogSummarySettings } from "@/lib/data/live-blog";
import { LeaderboardWidget } from "@/components/home/leaderboard-widget";
import { getArticles } from "@/lib/data/articles";
import { getSponsorClock } from "@/lib/data/sponsor-clock";
import { getActiveChampionshipId, getCompetitionLeaderboard } from "@/lib/data/scorecards";
import { getChampionshipHistory, isChampionshipInPlay } from "@/lib/data/championships";
import { getPlayoffs, applyPlayoffToEntries, getEligibleStablefordChampion } from "@/lib/data/playoffs";
import { LiveSummary } from "@/components/live-blog/live-summary";
import { ordinal } from "@/lib/utils";
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
// See src/app/(app)/page.tsx for why this is force-dynamic instead of revalidate = 60.
export const dynamic = "force-dynamic";

export default async function LiveBlogPage() {
  const [
    liveBlogPage,
    articles,
    clockConfig,
    banners,
    theme,
    mainRaw,
    stablefordRaw,
    scratchRaw,
    nettCategories,
    scratchCategories,
    streakCategories,
    drivingCategories,
    approachCategories,
    puttingCategories,
    playoffs,
    inPlay,
    activeChampionshipId,
    championshipHistory,
    summarySettings,
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
    getPlayoffs(),
    isChampionshipInPlay(),
    getActiveChampionshipId(),
    getChampionshipHistory(),
    getLiveBlogSummarySettings(),
  ]);

  const mainEntries = applyPlayoffToEntries(mainRaw, playoffs.find((p) => p.competition === "main"));
  const stablefordEntries = applyPlayoffToEntries(stablefordRaw, playoffs.find((p) => p.competition === "stableford"));
  const scratchEntries = applyPlayoffToEntries(scratchRaw, playoffs.find((p) => p.competition === "scratch"));
  const active = championshipHistory.find((c) => String(c.id) === String(activeChampionshipId));
  // The 2013 championship is the 1st, so the edition is a count of those played up to this one.
  const edition = active ? championshipHistory.filter((c) => c.year <= active.year).length : 0;

  return (
    <>
      <PageHero
        variant="photo"
        size="slim"
        imageLabel="Gallery watching on the 18th at Seabrook Old Course"
        imageUrl={banners.liveBlogUrl}
        eyebrow={banners.liveBlogEyebrow}
        title={banners.liveBlogTitle}
        description={banners.liveBlogDescription}
        overlay={<ChampionshipWeekSwitcher onPhoto />}
      />
  
      {/* theopen.com's live blog frame: a 1366px page (15px margins below that) split 911 : 455, the
          yellow summary and the navy rail both flush under the banner, posts padded inside the left
          column. Below lg the rail drops under the posts as a full-width navy band. */}
      <div className="bg-[#EEEEEE]">
        <div className="mx-auto grid max-w-[1366px] grid-cols-1 lg:w-[calc(100%-30px)] lg:grid-cols-[911fr_455fr]">
          <div className="flex min-w-0 flex-col">
            {active ? (
              <LiveSummary
                title={`The ${ordinal(edition)} Legs Open`}
                venueName={active.venueName}
                inPlay={inPlay}
                main={mainEntries}
                stableford={stablefordEntries}
                scratch={scratchEntries}
                stablefordChampion={getEligibleStablefordChampion(mainEntries, stablefordEntries)}
                settings={summarySettings}
              />
            ) : null}
            <div className="px-5 py-10 md:px-[30px] xl:px-[70px]">
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
            </div>
          </div>
          <div className="min-w-0 bg-surface-dark px-5 py-8 md:px-[30px] lg:px-0 lg:py-0">
            <ChampionshipSidebar
              featuredArticle={articles[0]}
              clockConfig={clockConfig}
              tone="dark"
              flush
              leaderboard={
                <LeaderboardWidget
                  compact
                  entries={mainEntries}
                  stableford={stablefordEntries}
                  scratch={scratchEntries}
                  nettCategories={nettCategories}
                  scratchCategories={scratchCategories}
                  streakCategories={streakCategories}
                  drivingCategories={drivingCategories}
                  approachCategories={approachCategories}
                  puttingCategories={puttingCategories}
                  championWinnerBadgeUrl={theme.championWinnerBadgeUrl}
                />
              }
            />
          </div>
        </div>
      </div>
    </>
  );
}
