import type { Metadata } from "next";

import { Container } from "@/components/shared/container";
import { NewsListing } from "@/components/news/news-listing";
import { getArticleCategories, getArticlesPage } from "@/lib/data/articles";
import { NEWS_PAGE_SIZE } from "@/lib/news-page-size";
import { getSeoSettings } from "@/lib/data/seo-settings";

// See src/app/(app)/page.tsx for why this route is force-dynamic.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoSettings();
  return { title: seo.latest.title, description: seo.latest.description };
}

/** "Tuesday 17th November", in UK time. */
function today(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/London" }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const day = Number(get("day"));
  const suffix = day % 10 === 1 && day !== 11 ? "st" : day % 10 === 2 && day !== 12 ? "nd" : day % 10 === 3 && day !== 13 ? "rd" : "th";
  return `${get("weekday")} ${day}${suffix} ${get("month")}`;
}

export default async function LatestPage() {
  const [{ items, hasMore }, categories] = await Promise.all([
    getArticlesPage({ page: 1, pageSize: NEWS_PAGE_SIZE }),
    getArticleCategories(),
  ]);

  return (
    <>
      {/* theopen.com's slim heading in place of the photo banner, so the stories start almost at once. */}
      <div className="border-b border-border bg-secondary/60">
        <Container className="py-6 sm:py-8">
          <h1 className="font-display text-[24px] leading-tight sm:text-[30px]">
            Latest from The Legs Open <span className="block font-bold">{today()}</span>
          </h1>
        </Container>
      </div>
      <Container className="py-8 sm:py-12">
        <NewsListing initialArticles={items} initialHasMore={hasMore} categories={categories} />
      </Container>
    </>
  );
}
