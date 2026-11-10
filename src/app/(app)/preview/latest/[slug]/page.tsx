import { notFound } from "next/navigation";
import Link from "next/link";

import { Container } from "@/components/shared/container";
import { RichTextBlock } from "@/components/shared/rich-text";
import { PlaceholderArt } from "@/components/shared/placeholder-art";
import { ArticleCard } from "@/components/news/article-card";
import { getArticleBySlug, getRelatedArticles } from "@/lib/data/articles";
import { SITE } from "@/constants/site";

export const dynamic = "force-dynamic";

const SECTION_TITLE = "font-menu text-[12px] font-normal uppercase leading-[13.8px] tracking-[2.4px] text-[#2a2a2a]";

/**
 * PREVIEW of /latest/[slug] with changes 22 (two columns with a Related rail), 23 (slim header:
 * eyebrow line, TITLE / dek, share icons) and 24 (More from... row and a tag), after theopen.com's
 * article page: a 748px article column and a rail beside it on a #F7F7F7 panel.
 */
export default async function ArticlePreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();
  const related = await getRelatedArticles(article, 6);
  const rail = related.slice(0, 3);
  const more = related.slice(3, 6).length === 3 ? related.slice(3, 6) : related.slice(0, 3);

  const url = `${SITE.url}/latest/${article.slug}`;
  const date = new Date(article.publishedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric", timeZone: "Europe/London" }).toUpperCase();

  return (
    <div className="bg-white">
      {/* 23: eyebrow line */}
      <div className="border-b border-[#B9BEC0]">
        <Container className="py-3">
          <p className={SECTION_TITLE}>
            {article.category} <span className="mx-2 text-[#B9BEC0]">|</span> {date}
          </p>
        </Container>
      </div>

      <Container className="py-8">
        <div className="grid grid-cols-1 bg-[#F7F7F7] lg:grid-cols-[minmax(0,888fr)_minmax(0,478fr)]">
          {/* 22: the article column */}
          <article className="flex flex-col gap-8 px-5 py-8 lg:px-[70px] lg:py-10">
            <div className="flex items-start justify-between gap-6">
              {/* 23: TITLE / dek on one line, as theirs */}
              <h1 className="font-menu text-[28px] leading-[1.2] text-[#2a2a2a] sm:text-[36px]">
                <span className="font-bold uppercase tracking-[1px]">{article.title}</span>
                {article.dek ? (
                  <>
                    <span className="mx-2 text-accent">/</span>
                    <span className="font-normal">{article.dek}</span>
                  </>
                ) : null}
              </h1>
              <div className="flex shrink-0 gap-2 pt-2">
                <a
                  href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(article.title)}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Share on X"
                  className="flex h-8 w-8 items-center justify-center bg-[#2a2a2a] text-xs font-bold text-white hover:bg-[#2269AB]"
                >
                  X
                </a>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Share on Facebook"
                  className="flex h-8 w-8 items-center justify-center bg-[#2a2a2a] text-sm font-bold text-white hover:bg-[#2269AB]"
                >
                  f
                </a>
              </div>
            </div>

            <PlaceholderArt
              label={article.heroLabel}
              imageUrl={article.imageUrl}
              tone="navy"
              ratio="16/9"
              className="w-full rounded-none"
              showCaption
              sizes="(min-width: 1430px) 748px, (min-width: 1024px) 55vw, 100vw"
              priority
            />

            <RichTextBlock data={article.body} className="max-w-[748px] font-sans text-[17px] font-light leading-[28px] text-[#2a2a2a]" dropBlankParagraphs />

            {/* 24: tag */}
            <div className="flex flex-col gap-3 border-t border-[#C2CCC2] pt-6">
              <p className={SECTION_TITLE}>Tags</p>
              <Link href="/latest" className="w-fit border border-[#2a2a2a] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#2a2a2a] hover:border-[#2269AB] hover:text-[#2269AB]">
                {article.category}
              </Link>
            </div>
          </article>

          {/* 22: the rail, kept in view while reading */}
          <aside className="px-5 pb-8 lg:py-10 lg:pr-5">
            <div className="flex flex-col gap-3 lg:sticky lg:top-24">
              <p className={SECTION_TITLE}>Related</p>
              {rail.length === 0 ? (
                <p className="text-sm text-[#43524E]">No related stories yet.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-[#C2CCC2] border-y border-[#C2CCC2]">
                  {rail.map((a) => (
                    <li key={a.slug}>
                      <Link href={`/latest/${a.slug}`} className="group flex items-start gap-4 py-[11px]">
                        <span className="relative h-[75px] w-[119px] shrink-0 overflow-hidden">
                          <PlaceholderArt label={a.heroLabel} imageUrl={a.imageUrl} tone="navy" fill sizes="119px" />
                        </span>
                        <span className="flex min-w-0 flex-col gap-1">
                          <span className="font-menu text-[10px] font-bold uppercase tracking-[1.6px] text-[#43524E]">{a.category}</span>
                          <span className="font-menu text-[15px] font-bold uppercase leading-[18px] tracking-[1px] text-[#2a2a2a] group-hover:text-[#2269AB]">
                            {a.title}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      </Container>

      {/* 24: More from... */}
      {more.length > 0 ? (
        <section className="border-t border-[#B9BEC0] bg-[#F7F7F7]">
          <Container className="flex flex-col gap-8 py-12">
            <h2 className="text-center font-menu text-[14px] font-bold uppercase tracking-[1.6px] text-[#43524E]">More from {article.category}</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              {more.map((a) => (
                <ArticleCard key={a.slug} article={a} />
              ))}
            </div>
          </Container>
        </section>
      ) : null}
    </div>
  );
}
