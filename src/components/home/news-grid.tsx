"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { ArticleCard } from "@/components/news/article-card";
import { SectionHeading } from "@/components/shared/section-heading";
import { Container } from "@/components/shared/container";
import { SectionGrid } from "@/components/shared/section-grid";
import { cn } from "@/lib/utils";
import type { Article } from "@/types/article";

/** Stories per dot. Laid out as two halves over three thirds -- see NewsPage. */
const PER_PAGE = 5;

/** The two cards on the top row sit in the 673px halves columns rather than the 442px thirds. */
const HALVES_SIZES = "(min-width: 1430px) 673px, (min-width: 1024px) 48vw, (min-width: 640px) 50vw, 100vw";

/**
 * The homepage's News and Features band, paged by dots in the way theopen.com pages theirs: a
 * yellow pill marks the current set, grey dots the others. Every article arrives with the page
 * (see NEWS_ARTICLE_COUNT in src/app/(app)/page.tsx), so changing dot is instant and never reads
 * from the database -- this replaced a "Load more stories" button that fetched each extra page.
 */
export function NewsGrid({ articles }: { articles: Article[] }) {
  const [page, setPage] = useState(0);
  const reduceMotion = useReducedMotion();

  const pages: Article[][] = [];
  for (let i = 0; i < articles.length; i += PER_PAGE) pages.push(articles.slice(i, i + PER_PAGE));
  const current = pages[Math.min(page, pages.length - 1)] ?? [];

  return (
    <section className="bg-surface-dark py-16 text-surface-dark-foreground sm:py-24">
      <Container className="flex flex-col gap-10">
        <div className="flex flex-col items-center gap-6">
          <SectionHeading
            tone="dark"
            eyebrow="Latest"
            title="News and features"
            description="The stories shaping championship week."
            align="center"
          />
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={page}
            id="news-features-page"
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            <NewsPage articles={current} />
          </motion.div>
        </AnimatePresence>

        {pages.length > 1 ? (
          <nav aria-label="News and features pages" className="flex items-center justify-center gap-1">
            {pages.map((_, index) => {
              const active = index === page;
              const first = index * PER_PAGE + 1;
              const last = index * PER_PAGE + pages[index].length;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => setPage(index)}
                  aria-label={`Show stories ${first} to ${last}`}
                  aria-current={active ? "true" : undefined}
                  aria-controls="news-features-page"
                  // The padding is the tap target; the visible dot is the span inside it.
                  className="group rounded-full p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <span
                    className={cn(
                      "block h-4 rounded-full transition-all duration-300 ease-standard",
                      active ? "w-12 bg-accent" : "w-4 bg-surface-dark-foreground/60 group-hover:bg-surface-dark-foreground/90",
                    )}
                  />
                </button>
              );
            })}
          </nav>
        ) : null}
      </Container>
    </section>
  );
}

/** Two stories in the halves columns, then up to three in the thirds -- the same 673/442 widths every other band uses. */
function NewsPage({ articles }: { articles: Article[] }) {
  const top = articles.slice(0, 2);
  const bottom = articles.slice(2);
  return (
    <div className="flex flex-col gap-12">
      <SectionGrid layout="halves" className="gap-y-12 sm:grid-cols-2">
        {top.map((article) => (
          <ArticleCard key={article.slug} article={article} tone="dark" sizes={HALVES_SIZES} />
        ))}
      </SectionGrid>
      {bottom.length > 0 ? (
        <SectionGrid layout="thirds" className="gap-y-12 sm:grid-cols-2">
          {bottom.map((article) => (
            <ArticleCard key={article.slug} article={article} tone="dark" />
          ))}
        </SectionGrid>
      ) : null}
    </div>
  );
}
