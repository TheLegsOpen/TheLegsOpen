import type { Metadata } from "next";

import { PageHero } from "@/components/shared/page-hero";
import { Container } from "@/components/shared/container";
import { NewsListing } from "@/components/news/news-listing";
import { getArticlesPage } from "@/lib/data/articles";

const PAGE_SIZE = 6;

export const metadata: Metadata = {
  title: "Latest News",
  description: "News, features and the greatest stories from The Legs Open.",
};

export default async function LatestPage() {
  const { items, hasMore } = await getArticlesPage({ page: 1, pageSize: PAGE_SIZE });

  return (
    <>
      <PageHero
        eyebrow="Latest"
        title="News and features"
        description="The greatest stories in golf, from championship week and beyond."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Latest News" }]}
      />
      <Container className="py-16 sm:py-24">
        <NewsListing initialArticles={items} initialHasMore={hasMore} />
      </Container>
    </>
  );
}
