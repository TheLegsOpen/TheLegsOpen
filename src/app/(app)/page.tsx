import { Hero } from "@/components/home/hero";
import { LeaderboardWidget } from "@/components/home/leaderboard-widget";
import { HomepageSections } from "@/components/home/sections/homepage-sections";
import { ProductShowcaseCarousel } from "@/components/home/product-showcase-carousel";
import { NewsGrid } from "@/components/home/news-grid";
import { getArticlesPage } from "@/lib/data/articles";
import { getCurrentChampion, getHomepageSections } from "@/lib/data/homepage-settings";
import { getCompetitionLeaderboard } from "@/lib/data/scorecards";

const PAGE_SIZE = 6;

export default async function HomePage() {
  const [{ items: initialArticles, hasMore: initialHasMore }, currentChampion, leaderboard, sections] = await Promise.all([
    getArticlesPage({ page: 1, pageSize: PAGE_SIZE }),
    getCurrentChampion(),
    getCompetitionLeaderboard("main"),
    getHomepageSections(),
  ]);

  return (
    <>
      <Hero currentChampion={currentChampion} />
      <LeaderboardWidget entries={leaderboard} />
      <HomepageSections sections={sections} />
      <ProductShowcaseCarousel />
      <NewsGrid initialArticles={initialArticles} initialHasMore={initialHasMore} />
    </>
  );
}
