"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { PlaceholderArt } from "@/components/shared/placeholder-art";
import { SectionHeading } from "@/components/shared/section-heading";
import { Container } from "@/components/shared/container";
import { cn } from "@/lib/utils";
import type { Article } from "@/types/article";

/** Stories per dot: one row of five -- see NewsPage. */
const PER_PAGE = 5;

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

/** theopen.com's 227px square image -- a fifth of the 1366 container less gutters and card padding. */
const CARD_IMAGE_SIZES = "(min-width: 1430px) 227px, (min-width: 1024px) 17vw, (min-width: 640px) 45vw, 100vw";

/**
 * One row of five, copied from theopen.com's homepage "News and Features" carousel measured at
 * 1920: 257px navy cards on 20px gutters across the 1366 container, 15px inside each, 20px between
 * a square image and the text. The text is centred: the title in Founders Grotesk Light at 24px in
 * #D9D9D9, the summary at 16px in white at 80%, then a yellow Full Article button with an arrow,
 * pushed to the card's foot so the buttons line up across the row whatever the text length.
 *
 * Their titles are a word or two ("Carnoustie"); ours are whole headlines, so the title is held to
 * three lines and the summary to three, keeping the cards a sane height. Narrower screens drop to
 * three, two and one across.
 */
function NewsPage({ articles }: { articles: Article[] }) {
  return (
    <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
      {articles.map((article) => (
        <li key={article.slug} className="flex">
          <Link
            href={`/latest/${article.slug}`}
            className="group flex w-full flex-col gap-5 bg-primary p-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <div className="overflow-hidden">
              <PlaceholderArt
                label={article.heroLabel}
                imageUrl={article.imageUrl}
                tone="navy"
                ratio="1/1"
                sizes={CARD_IMAGE_SIZES}
                className="rounded-none transition-transform duration-300 ease-standard group-hover:scale-[1.03]"
              />
            </div>
            <div className="flex flex-1 flex-col items-center gap-[15px] text-center">
              <h3 className="line-clamp-3 font-sans text-[24px] font-light capitalize leading-[28.8px] text-[#D9D9D9]">{article.title}</h3>
              {article.dek ? <p className="line-clamp-3 font-sans text-[16px] font-light leading-[19px] text-white/80">{article.dek}</p> : null}
              {/* The same button as every other yellow box on the home page (ArticleCard's "Read
                  more", the hero's "Read the story"): Founders Grotesk Light at 17px in #06051e.
                  It was the Bold cut with taller padding, which made it the odd one out. */}
              <span className="mt-auto inline-flex w-fit items-center gap-1.5 bg-accent px-4 py-2 font-sans text-[17px] font-light uppercase leading-[20.4px] tracking-[0.3px] text-[#06051e] transition-colors group-hover:bg-white">
                Full article
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
