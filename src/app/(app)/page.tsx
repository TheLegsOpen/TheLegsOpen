import { Hero } from "@/components/home/hero";
import { LeaderboardWidget } from "@/components/home/leaderboard-widget";
import { LiveBlogWidget } from "@/components/home/live-blog-widget";
import { HomepageSections } from "@/components/home/sections/homepage-sections";
import { ProductShowcaseCarousel } from "@/components/home/product-showcase-carousel";
import { NewsGrid } from "@/components/home/news-grid";
import { Container } from "@/components/shared/container";
import { getArticlesPage } from "@/lib/data/articles";
import { getCurrentChampion, getHomepageSections } from "@/lib/data/homepage-settings";
import { getCompetitionLeaderboard } from "@/lib/data/scorecards";
import { getLiveBlogPosts } from "@/lib/data/live-blog";
import { getSponsorClock } from "@/lib/data/sponsor-clock";
import { getVenueWeather } from "@/lib/data/weather";

const PAGE_SIZE = 6;

export default async function HomePage() {
  const [{ items: initialArticles, hasMore: initialHasMore }, currentChampion, leaderboard, liveBlogPosts, sections, clockConfig, weather] =
    await Promise.all([
      getArticlesPage({ page: 1, pageSize: PAGE_SIZE }),
      getCurrentChampion(),
      getCompetitionLeaderboard("main"),
      getLiveBlogPosts(),
      getHomepageSections(),
      getSponsorClock(),
      getVenueWeather(),
    ]);

  return (
    <>
      <Hero currentChampion={currentChampion} clockConfig={clockConfig} weather={weather} />
      <section className="bg-surface-dark bg-dashboard-pattern py-16 text-surface-dark-foreground sm:py-24">
        <Container className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <LeaderboardWidget entries={leaderboard} />
          <LiveBlogWidget entries={liveBlogPosts} />
        </Container>
      </section>
      <HomepageSections sections={sections} />
      <ProductShowcaseCarousel />
      <NewsGrid initialArticles={initialArticles} initialHasMore={initialHasMore} />
    </>
  );
}
