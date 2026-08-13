export type ArticleCategory =
  | "Championship News"
  | "Player Features"
  | "History"
  | "Tickets"
  | "Course Guide";

export interface Article {
  slug: string;
  title: string;
  dek: string;
  category: ArticleCategory;
  publishedAt: string;
  readTimeMinutes: number;
  heroLabel: string;
  imageUrl?: string;
  /** Raw Lexical document -- rendered with @payloadcms/richtext-lexical/react's RichText component so real formatting (lists, links, bold, line breaks) survives, instead of being flattened to plain-text paragraphs. */
  body: unknown;
}
