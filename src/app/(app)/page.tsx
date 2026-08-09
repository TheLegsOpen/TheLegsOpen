import { Hero } from "@/components/home/hero";
import { NewsTicker } from "@/components/home/news-ticker";
import { LeaderboardWidget } from "@/components/home/leaderboard-widget";
import { LiveBlogWidget } from "@/components/home/live-blog-widget";
import { HomepageSections } from "@/components/home/sections/homepage-sections";
import { NewsGrid } from "@/components/home/news-grid";
import { Container } from "@/components/shared/container";
import { getArticlesPage } from "@/lib/data/articles";
import { getCurrentChampion, getHomepageSections } from "@/lib/data/homepage-settings";
import { getCompetitionLeaderboard } from "@/lib/data/scorecards";
import { getLiveBlogPosts } from "@/lib/data/live-blog";
import { getSponsorClock } from "@/lib/data/sponsor-clock";
import { getSiteTheme } from "@/lib/data/site-theme";
import { getVenueWeather } from "@/lib/data/weather";
import { getNewsTicker } from "@/lib/data/news-ticker";
import { getPlayoffs, applyPlayoffToEntries } from "@/lib/data/playoffs";
import {
  getNettScoringCategories,
  getScratchScoringCategories,
  getStreakCategories,
  getDrivingCategories,
  getApproachCategories,
  getPuttingCategories,
} from "@/lib/data/scoring-statistics";

const PAGE_SIZE = 6;

export default async function HomePage() {
  const [
    { items: initialArticles, hasMore: initialHasMore },
    currentChampion,
    mainRaw,
    stablefordRaw,
    scratchRaw,
    liveBlogPage,
    sections,
    clockConfig,
    weather,
    tickerItems,
    playoffs,
    nettCategories,
    scratchCategories,
    streakCategories,
    drivingCategories,
    approachCategories,
    puttingCategories,
    theme,
  ] = await Promise.all([
    getArticlesPage({ page: 1, pageSize: PAGE_SIZE }),
    getCurrentChampion(),
    getCompetitionLeaderboard("main"),
    getCompetitionLeaderboard("stableford"),
    getCompetitionLeaderboard("scratch"),
    getLiveBlogPosts(),
    getHomepageSections(),
    getSponsorClock(),
    getVenueWeather(),
    getNewsTicker(),
    getPlayoffs(),
    getNettScoringCategories(),
    getScratchScoringCategories(),
    getStreakCategories(),
    getDrivingCategories(),
    getApproachCategories(),
    getPuttingCategories(),
    getSiteTheme(),
  ]);

  const leaderboard = applyPlayoffToEntries(mainRaw, playoffs.find((p) => p.competition === "main"));
  const stableford = applyPlayoffToEntries(stablefordRaw, playoffs.find((p) => p.competition === "stableford"));
  const scratch = applyPlayoffToEntries(scratchRaw, playoffs.find((p) => p.competition === "scratch"));

  return (
    <>
      <NewsTicker items={tickerItems} />
      <Hero currentChampion={currentChampion} clockConfig={clockConfig} weather={weather} />
      <section className="bg-surface-dark py-16 text-surface-dark-foreground sm:py-24">
        <Container className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <LeaderboardWidget
            entries={leaderboard}
            stableford={stableford}
            scratch={scratch}
            nettCategories={nettCategories}
            scratchCategories={scratchCategories}
            streakCategories={streakCategories}
            drivingCategories={drivingCategories}
            approachCategories={approachCategories}
            puttingCategories={puttingCategories}
            championBadgeUrl={theme.championBadgeUrl}
            championWinnerBadgeUrl={theme.championWinnerBadgeUrl}
          />
          <LiveBlogWidget entries={liveBlogPage.entries} />
        </Container>
      </section>
      <HomepageSections sections={sections} />
      <NewsGrid initialArticles={initialArticles} initialHasMore={initialHasMore} />
    </>
  );
}
