import { Hero } from "@/components/home/hero";
import { LeaderboardWidget } from "@/components/home/leaderboard-widget";
import { InfoBlocks } from "@/components/home/info-blocks";
import { ProductShowcaseCarousel } from "@/components/home/product-showcase-carousel";
import { NewsGrid } from "@/components/home/news-grid";
import { getArticles, getArticlesPage } from "@/lib/data/articles";
import { getCurrentChampion } from "@/lib/data/homepage-settings";
import { getLeaderboard } from "@/lib/data/leaderboard";
import { getStatCategories } from "@/lib/data/statistics";

const PAGE_SIZE = 6;
const WIDGET_TOP_COUNT = 5;

export default async function HomePage() {
  const [{ items: initialArticles, hasMore: initialHasMore }, currentChampion, leaderboard, articles, statCategories] =
    await Promise.all([
      getArticlesPage({ page: 1, pageSize: PAGE_SIZE }),
      getCurrentChampion(),
      getLeaderboard("round4"),
      getArticles(),
      getStatCategories(),
    ]);

  return (
    <>
      <Hero currentChampion={currentChampion} />
      <LeaderboardWidget entries={leaderboard.slice(0, WIDGET_TOP_COUNT)} statCategories={statCategories} articles={articles} />
      <InfoBlocks />
      <ProductShowcaseCarousel />
      <NewsGrid initialArticles={initialArticles} initialHasMore={initialHasMore} />
    </>
  );
}
