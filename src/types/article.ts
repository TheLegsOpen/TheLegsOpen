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
  body: string[];
}
