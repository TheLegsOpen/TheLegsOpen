import { markdown as southerness2016 } from "./2016-southerness";

/**
 * Championship write-ups authored as Markdown and published through /api/admin-article.
 *
 * They live in the repo rather than being typed into the admin because an article body is a
 * Lexical node tree, not text -- see src/lib/articles/markdown-to-lexical.ts. Keeping the source
 * here means a piece can be drafted, reviewed in a diff and corrected like any other writing,
 * while the published article stays an ordinary Articles document that anyone can edit afterwards.
 *
 * Adding one: write the Markdown in its own file, import it, and add an entry below. The route
 * matches on `slug`, so re-publishing the same slug updates the existing article rather than
 * creating a second copy.
 */

export type ArticleCategory = "Championship News" | "Player Features" | "History" | "Tickets" | "Course Guide";

export interface ArticleSource {
  slug: string;
  title: string;
  /** One-sentence standfirst, shown on cards and under the headline. */
  dek: string;
  category: ArticleCategory;
  /** Dated to the championship it reports, so the site's chronology reads straight. */
  publishedAt: string;
  /** Caption when no image is set, and alt text when one is. */
  heroLabel: string;
  markdown: string;
}

export const ARTICLE_SOURCES: ArticleSource[] = [
  {
    slug: "2016-southerness-clee-back-to-back",
    title: "Clee goes back-to-back at Southerness",
    dek: "The fourth Legs Open was played in a wind that would have justified calling it off: eleven men started, five returned a card, and David Clee won two titles in an afternoon.",
    category: "Championship News",
    publishedAt: "2016-07-24T12:00:00.000Z",
    heroLabel: "David Clee at Southerness, July 2016",
    markdown: southerness2016,
  },
];

export function findArticleSource(slug: string): ArticleSource | undefined {
  return ARTICLE_SOURCES.find((source) => source.slug === slug);
}
