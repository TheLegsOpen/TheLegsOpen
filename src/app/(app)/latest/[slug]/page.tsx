import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { Container } from "@/components/shared/container";
import { ArticleRichText } from "@/components/news/article-rich-text";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { PlaceholderArt } from "@/components/shared/placeholder-art";
import { Badge } from "@/components/ui/badge";
import { ArticleCard } from "@/components/news/article-card";
import { getAllArticleSlugs, getArticleBySlug, getRelatedArticles } from "@/lib/data/articles";
import { SITE } from "@/constants/site";
import { formatDate } from "@/lib/utils";

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = await getAllArticleSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.dek,
    openGraph: { title: article.title, description: article.dek, type: "article" },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  const related = await getRelatedArticles(article);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.dek,
    datePublished: article.publishedAt,
    author: { "@type": "Organization", name: SITE.name },
    publisher: { "@type": "Organization", name: SITE.name },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Container className="flex flex-col gap-8 py-10 sm:py-14">
        <Breadcrumbs
          items={[{ label: "Home", href: "/" }, { label: "Latest News", href: "/latest" }, { label: article.title }]}
        />

        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          <Badge variant="muted" className="w-fit">
            {article.category}
          </Badge>
          <h1 className="font-display font-bold text-display-lg text-balance">{article.title}</h1>
          <p className="text-lg text-muted-foreground">{article.dek}</p>
          <p className="text-sm text-muted-foreground">
            {formatDate(article.publishedAt)} · {article.readTimeMinutes} min read
          </p>
        </div>

        <PlaceholderArt
          label={article.heroLabel}
          imageUrl={article.imageUrl}
          tone="navy"
          ratio="21/9"
          className="mx-auto w-full max-w-4xl"
          showCaption
        />

        <ArticleRichText data={article.body} className="mx-auto max-w-2xl" />
      </Container>

      {related.length > 0 ? (
        <Container className="border-t border-border py-16">
          <h2 className="mb-8 font-display text-display-sm">More {article.category}</h2>
          <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-3">
            {related.map((a) => (
              <ArticleCard key={a.slug} article={a} />
            ))}
          </div>
          <div className="mt-10">
            <Link href="/latest" className="text-sm font-medium text-primary hover:underline">
              ← Back to all news
            </Link>
          </div>
        </Container>
      ) : null}
    </>
  );
}
