import { Hero } from "@/components/home/hero";
import { FeaturedBallotCard } from "@/components/home/featured-ballot-card";
import { LeaderboardWidget } from "@/components/home/leaderboard-widget";
import { InfoBlocks } from "@/components/home/info-blocks";
import { ProductShowcaseCarousel } from "@/components/home/product-showcase-carousel";
import { NewsGrid } from "@/components/home/news-grid";
import { getArticlesPage } from "@/lib/data/articles";
import { getCurrentChampion } from "@/lib/data/players";
import { getLeaderboard } from "@/lib/data/leaderboard";

const PAGE_SIZE = 6;
const WIDGET_TOP_COUNT = 5;

export default async function HomePage() {
  const [{ items: initialArticles, hasMore: initialHasMore }, currentChampion, leaderboard] = await Promise.all([
    getArticlesPage({ page: 1, pageSize: PAGE_SIZE }),
    getCurrentChampion(),
    getLeaderboard("round4"),
  ]);

  return (
    <>
      <Hero currentChampion={currentChampion} />
      <FeaturedBallotCard />
      <LeaderboardWidget entries={leaderboard.slice(0, WIDGET_TOP_COUNT)} />
      <InfoBlocks />
      <ProductShowcaseCarousel />
      <NewsGrid initialArticles={initialArticles} initialHasMore={initialHasMore} />
    </>
  );
}
