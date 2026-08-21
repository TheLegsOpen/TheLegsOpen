import type { Metadata } from "next";

import { PageHero } from "@/components/shared/page-hero";
import { Container } from "@/components/shared/container";
import { NewsListing } from "@/components/news/news-listing";
import { getArticlesPage } from "@/lib/data/articles";
import { getPageBanners } from "@/lib/data/page-banners";
import { getSeoSettings } from "@/lib/data/seo-settings";

const PAGE_SIZE = 6;

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoSettings();
  return { title: seo.latest.title, description: seo.latest.description };
}

export default async function LatestPage() {
  const [{ items, hasMore }, banners] = await Promise.all([getArticlesPage({ page: 1, pageSize: PAGE_SIZE }), getPageBanners()]);

  return (
    <>
      <PageHero
        variant="photo"
        size="compact"
        imageLabel="The Legs Open press box"
        imageUrl={banners.latestUrl}
        eyebrow={banners.latestEyebrow}
        title={banners.latestTitle}
        description={banners.latestDescription}
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Latest News" }]}
      />
      <Container className="py-16 sm:py-24">
        <NewsListing initialArticles={items} initialHasMore={hasMore} />
      </Container>
    </>
  );
}
