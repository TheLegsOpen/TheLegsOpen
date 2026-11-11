import type { Metadata } from "next";

import { AutoRefresh } from "@/components/shared/auto-refresh";
import { Hero } from "@/components/home/hero";
import { LeaderboardWidget } from "@/components/home/leaderboard-widget";
import { LiveBlogWidget } from "@/components/home/live-blog-widget";
import { HomepageSections } from "@/components/home/sections/homepage-sections";
import { NewsGrid } from "@/components/home/news-grid";
import { Container } from "@/components/shared/container";
import { SectionGrid } from "@/components/shared/section-grid";
import { getArticlesPage } from "@/lib/data/articles";
import { isChampionshipInPlay } from "@/lib/data/championships";
import { getCurrentChampion, getHomepageSections } from "@/lib/data/homepage-settings";
import { getCompetitionLeaderboard } from "@/lib/data/scorecards";
import { getLiveBlogPosts } from "@/lib/data/live-blog";
import { getSponsorClock } from "@/lib/data/sponsor-clock";
import { getSiteTheme } from "@/lib/data/site-theme";
import { getVenueWeather } from "@/lib/data/weather";
import { getPlayoffs, applyPlayoffToEntries } from "@/lib/data/playoffs";
import { getSeoSettings } from "@/lib/data/seo-settings";
import {
  getNettScoringCategories,
  getScratchScoringCategories,
  getStreakCategories,
  getDrivingCategories,
  getApproachCategories,
  getPuttingCategories,
} from "@/lib/data/scoring-statistics";

/** Three dots of five in the News and Features carousel -- see NewsGrid. Fetched in one query up
 * front, so moving between dots never goes back to the database. */
const NEWS_ARTICLE_COUNT = 15;

/** Matches the ~10s live-score polling cadence measured on theopen.com/leaderboard. */
const LIVE_POLL_INTERVAL_MS = 10_000;

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
// single billing cycle -- raised well past the client's own auto-refresh poll.
//
// That last clause used to end "...which mostly hits Vercel's CDN cache rather than the database
// as long as this window hasn't elapsed", which stopped being true the moment this page became
// force-dynamic below: there is no cache window any more, so every poll is a real render against
// Supabase. The sentence outlived the thing that made it true, and it is why the poll went
// unexamined for so long. The poll is now gated on a championship actually being played --
// see isChampionshipInPlay.
// Was `revalidate = 60` (ISR). Vercel's build machine can't reliably reach Supabase (see
// src/payload.config.ts), which fails static generation outright -- force-dynamic renders this
// per-request instead, trading the 60s edge cache for a build that actually succeeds.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoSettings();
  // { absolute: ... } bypasses the root layout's "%s | The Legs Open" template -- home's own SEO
  // title is already the full page title, not a segment name to be suffixed with the site name.
  return { title: { absolute: seo.home.title }, description: seo.home.description };
}

export default async function HomePage() {
  const [
    { items: newsArticles },
    currentChampion,
    mainRaw,
    stablefordRaw,
    scratchRaw,
    liveBlogPage,
    sections,
    clockConfig,
    weather,
    playoffs,
    nettCategories,
    scratchCategories,
    streakCategories,
    drivingCategories,
    approachCategories,
    puttingCategories,
    theme,
    inPlay,
  ] = await Promise.all([
    getArticlesPage({ page: 1, pageSize: NEWS_ARTICLE_COUNT }),
    getCurrentChampion(),
    getCompetitionLeaderboard("main"),
    getCompetitionLeaderboard("stableford"),
    getCompetitionLeaderboard("scratch"),
    getLiveBlogPosts(),
    getHomepageSections(),
    getSponsorClock(),
    getVenueWeather(),
    getPlayoffs(),
    getNettScoringCategories(),
    getScratchScoringCategories(),
    getStreakCategories(),
    getDrivingCategories(),
    getApproachCategories(),
    getPuttingCategories(),
    getSiteTheme(),
    isChampionshipInPlay(),
  ]);

  const leaderboard = applyPlayoffToEntries(mainRaw, playoffs.find((p) => p.competition === "main"));
  const stableford = applyPlayoffToEntries(stablefordRaw, playoffs.find((p) => p.competition === "stableford"));
  const scratch = applyPlayoffToEntries(scratchRaw, playoffs.find((p) => p.competition === "scratch"));

  return (
    <>
      {/* Only during the three days around a championship. The live blog is pushed over a Supabase
          Realtime websocket regardless (see LiveBlogWidget), so the one thing that genuinely
          changes out of season still arrives without a poll. */}
      <AutoRefresh intervalMs={inPlay ? LIVE_POLL_INTERVAL_MS : null} />
      {currentChampion ? <Hero currentChampion={currentChampion} clockConfig={clockConfig} weather={weather} /> : null}
      <section className="bg-surface-dark py-16 text-surface-dark-foreground sm:py-24">
        <Container>
          {/* Equal halves. These are two widgets rather than a main one and a sidebar: the
              leaderboard wants width for its columns, but the live blog is the thing people sit on
              during a championship and it reads badly squeezed into a third. The 20px gutter is
              the one every other band uses; it is the proportion that is ours rather than The
              Open's. */}
          <SectionGrid layout="halves">
            {/* Breaks out of the Container's own side padding below `lg` (matches
                aigwomensopen.com's edge-to-edge mobile leaderboard) -- resets to normal once it's
                sharing the row with the live blog widget at `lg` and up. */}
            <div className="-mx-5 md:-mx-[30px] lg:mx-0">
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
            {/* Edge to edge below `lg`, like the leaderboard above it. */}
            <div className="-mx-5 md:-mx-[30px] lg:mx-0">
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
            </div>
          </SectionGrid>
        </Container>
      </section>
      <HomepageSections sections={sections} />
      <NewsGrid articles={newsArticles} />
    </>
  );
}
