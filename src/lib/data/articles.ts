import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { mediaUrl, slugify } from "@/lib/utils";
import type { Article, ArticleCategory } from "@/types/article";
import type { Article as PayloadArticle } from "@/payload-types";

/**
 * Data-access seam for editorial content — now backed by the Articles
 * collection in Payload/Postgres rather than local fixtures.
 */

function mapArticle(doc: PayloadArticle): Article {
  return {
    slug: doc.slug ?? slugify(doc.title),
    title: doc.title,
    dek: doc.dek,
    // Populated at depth 1 or more, which every site-facing query here uses. Falls back to an
    // empty string rather than throwing if a query ever runs at depth 0: a card with no category
    // chip on it is a far better failure than a page that will not render.
    category: typeof doc.category === "object" && doc.category ? doc.category.name : "",
    publishedAt: doc.publishedAt,
    readTimeMinutes: doc.readTimeMinutes,
    heroLabel: doc.heroLabel,
    imageUrl: mediaUrl(doc.image),
    isChampionshipOverview: doc.isChampionshipOverview ?? undefined,
    body: doc.body,
  };
}

// Drafts are enabled on this collection so editors can save work-in-progress
// without it going live — `find`/`findByID` return documents of any status
// unless explicitly filtered, so every site-facing query below excludes drafts.
const PUBLISHED: { _status: { equals: "published" } } = { _status: { equals: "published" } };

export async function getArticles(): Promise<Article[]> {
  const payload = await getPayload({ config: configPromise });
  const result = await payload.find({ collection: "articles", where: PUBLISHED, limit: 200, sort: "-publishedAt" });
  return result.docs.map(mapArticle);
}

// Falls back to an empty page instead of throwing -- see the fallback on getSiteTheme
// (src/lib/data/site-theme.ts) for why: a Supabase pooler timeout shouldn't 500 a whole page.
// This one's used on the homepage itself, so it's on the critical path for every visitor.
export async function getArticlesPage(options: {
  page: number;
  pageSize: number;
  category?: ArticleCategory | "All";
}): Promise<{ items: Article[]; hasMore: boolean; total: number }> {
  try {
    const payload = await getPayload({ config: configPromise });
    const where =
      options.category && options.category !== "All"
        // Matched on the category's name rather than its id, so every caller can keep passing the
        // string it already had -- the homepage, the listing's filter buttons, and the related
        // rail below. Names carry a unique index, so one name is one row.
        ? { and: [PUBLISHED, { "category.name": { equals: options.category } }] }
        : PUBLISHED;
    const result = await payload.find({
      collection: "articles",
      where,
      page: options.page,
      limit: options.pageSize,
      sort: "-publishedAt",
    });
    return { items: result.docs.map(mapArticle), hasMore: result.hasNextPage, total: result.totalDocs };
  } catch {
    return { items: [], hasMore: false, total: 0 };
  }
}

export async function getArticleBySlug(slug: string): Promise<Article | undefined> {
  const payload = await getPayload({ config: configPromise });
  const result = await payload.find({
    collection: "articles",
    where: { and: [PUBLISHED, { slug: { equals: slug } }] },
    limit: 1,
  });
  return result.docs[0] ? mapArticle(result.docs[0]) : undefined;
}

export async function getRelatedArticles(article: Article, limit = 3): Promise<Article[]> {
  const payload = await getPayload({ config: configPromise });
  const result = await payload.find({
    collection: "articles",
    where: { and: [PUBLISHED, { "category.name": { equals: article.category } }, { slug: { not_equals: article.slug } }] },
    limit,
  });
  return result.docs.map(mapArticle);
}

export async function getAllArticleSlugs(): Promise<string[]> {
  const payload = await getPayload({ config: configPromise });
  const result = await payload.find({ collection: "articles", where: PUBLISHED, limit: 200 });
  return result.docs.map((doc) => doc.slug ?? slugify(doc.title));
}

/**
 * Articles tagged to a championship, for the rail on its Overview tab.
 *
 * Tagged rather than matched on publishedAt: the backdating gave every piece the real date it
 * would have carried, so a year filter would be mostly right and occasionally wrong -- the roll
 * of honour went out in August 2026 and belongs to no single championship. An explicit field
 * means the rail only ever shows what someone put there, and shows nothing when nobody has.
 *
 * Swallows its errors like the rest of this file: a pooler timeout should cost the page its rail,
 * not the whole championship.
 */
/*
 * Six rather than four, because one of these may be the piece flagged as the championship's
 * Overview and the caller pulls it out of this same list rather than paying for a second query.
 * Sorted newest first, so with a tight limit an older flagged write-up could fall off the end and
 * the Overview would quietly revert to its generated summary. Two headroom covers every
 * championship on the site and most of what anyone is likely to tag to one.
 */
export async function getArticlesForChampionship(championshipId: string, limit = 6): Promise<Article[]> {
  try {
    const payload = await getPayload({ config: configPromise });
    const result = await payload.find({
      collection: "articles",
      where: { ...PUBLISHED, championship: { equals: championshipId } },
      limit,
      sort: "-publishedAt",
      depth: 1,
    });
    return result.docs.map(mapArticle);
  } catch {
    return [];
  }
}

/**
 * The categories, for the filter buttons on the News page.
 *
 * Ordered by sortOrder with the blanks last, so a category added in the admin without one lands
 * at the end rather than jumping to the front -- Postgres sorts NULL first on an ascending sort
 * unless told otherwise, which would put every new category before the five that were here
 * already.
 *
 * Falls back to an empty list like everything else in this file: no filter buttons is a worse
 * News page, not a broken one.
 */
export async function getArticleCategories(): Promise<string[]> {
  try {
    const payload = await getPayload({ config: configPromise });
    const result = await payload.find({
      collection: "article-categories",
      limit: 100,
      depth: 0,
      sort: ["sortOrder", "name"],
    });
    const withOrder = result.docs.filter((doc) => typeof doc.sortOrder === "number");
    const without = result.docs.filter((doc) => typeof doc.sortOrder !== "number");
    return [...withOrder, ...without].map((doc) => doc.name);
  } catch {
    return [];
  }
}
