/**
 * The name of a category, as typed into the Article Categories collection. A plain string rather
 * than a union: the list is rows in the database now, so the set is not knowable at compile time
 * and pinning it here would only go stale the first time someone adds one.
 */
export type ArticleCategory = string;

export interface Article {
  slug: string;
  title: string;
  dek: string;
  category: ArticleCategory;
  publishedAt: string;
  readTimeMinutes: number;
  heroLabel: string;
  imageUrl?: string;
  /** Renders in place of the generated summary on its championship's Overview tab. */
  isChampionshipOverview?: boolean;
  /** Raw Lexical document -- rendered with @payloadcms/richtext-lexical/react's RichText component so real formatting (lists, links, bold, line breaks) survives, instead of being flattened to plain-text paragraphs. */
  body: unknown;
}
