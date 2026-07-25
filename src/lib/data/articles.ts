import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { lexicalToPlainParagraphs } from "@/lib/lexical";
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
    category: doc.category,
    publishedAt: doc.publishedAt,
    readTimeMinutes: doc.readTimeMinutes,
    heroLabel: doc.heroLabel,
    imageUrl: mediaUrl(doc.image),
    body: lexicalToPlainParagraphs(doc.body),
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

export async function getArticlesPage(options: {
  page: number;
  pageSize: number;
  category?: ArticleCategory | "All";
}): Promise<{ items: Article[]; hasMore: boolean; total: number }> {
  const payload = await getPayload({ config: configPromise });
  const where =
    options.category && options.category !== "All"
      ? { and: [PUBLISHED, { category: { equals: options.category } }] }
      : PUBLISHED;
  const result = await payload.find({
    collection: "articles",
    where,
    page: options.page,
    limit: options.pageSize,
    sort: "-publishedAt",
  });
  return { items: result.docs.map(mapArticle), hasMore: result.hasNextPage, total: result.totalDocs };
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
    where: { and: [PUBLISHED, { category: { equals: article.category } }, { slug: { not_equals: article.slug } }] },
    limit,
  });
  return result.docs.map(mapArticle);
}

export async function getAllArticleSlugs(): Promise<string[]> {
  const payload = await getPayload({ config: configPromise });
  const result = await payload.find({ collection: "articles", where: PUBLISHED, limit: 200 });
  return result.docs.map((doc) => doc.slug ?? slugify(doc.title));
}
