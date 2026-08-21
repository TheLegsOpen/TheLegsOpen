import { AutoRefresh } from "@/components/shared/auto-refresh";
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

// Hard ceiling on ISR staleness for this live-scoring page. On-demand revalidation
// (revalidateSite, fired on every scorecard save) alone isn't enough on a low-traffic hostname --
// Was 10s: Vercel's edge cache is keyed per-hostname, and www.thelegsopen.com and
// the-legs-open.vercel.app being live alongside the canonical domain meant traffic (and cache-
// warming) split three ways, letting the least-hit one sit stale for 800+s while the others
// stayed fresh. Fixed at the root by redirecting both into the canonical domain (next.config.mjs)
// rather than papering over it with an aggressive timer -- confirmed working, so this is now just
// a fallback ceiling for on-demand revalidation (see src/lib/revalidate.ts) missing a case, not
// the primary freshness mechanism. Egress is metered per read this database now (Supabase), and a
// 10s ceiling across every high-traffic page was reading the same data ~360x its own size in a
// single billing cycle -- raised well past the client's own 10s auto-refresh poll, which mostly
// hits Vercel's CDN cache rather than the database as long as this window hasn't elapsed.
export const revalidate = 60;

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
      <AutoRefresh intervalMs={10_000} />
      <NewsTicker items={tickerItems} />
      {currentChampion ? <Hero currentChampion={currentChampion} clockConfig={clockConfig} weather={weather} /> : null}
      <section className="bg-surface-dark py-16 text-surface-dark-foreground sm:py-24">
        <Container className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          {/* Breaks out of the Container's own side padding below `lg` (matches
              aigwomensopen.com's edge-to-edge mobile leaderboard) -- resets to normal once it's
              sharing the row with the live blog widget at `lg` and up. */}
          <div className="-mx-4 sm:-mx-6 lg:mx-0">
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
              championWinnerBadgeUrl={theme.championWinnerBadgeUrl}
            />
          </div>
          <LiveBlogWidget
            entries={liveBlogPage.entries}
            championshipId={liveBlogPage.championshipId}
            mainEntries={leaderboard}
            stablefordEntries={stableford}
            scratchEntries={scratch}
            nettCategories={nettCategories}
            scratchCategories={scratchCategories}
            streakCategories={streakCategories}
            drivingCategories={drivingCategories}
            approachCategories={approachCategories}
            puttingCategories={puttingCategories}
            logoUrl={theme.logoUrl}
          />
        </Container>
      </section>
      <HomepageSections sections={sections} />
      <NewsGrid initialArticles={initialArticles} initialHasMore={initialHasMore} />
    </>
  );
}
