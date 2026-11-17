"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, Loader2 } from "lucide-react";

import { PlaceholderArt } from "@/components/shared/placeholder-art";
import { SectionGrid } from "@/components/shared/section-grid";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NEWS_PAGE_SIZE } from "@/lib/news-page-size";
import { cn, formatDate } from "@/lib/utils";
import type { Article, ArticleCategory } from "@/types/article";

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function StoryMeta({ article }: { article: Article }) {
  return (
    <p className="text-xs text-muted-foreground">
      {formatDate(article.publishedAt)} · {article.readTimeMinutes} min read
    </p>
  );
}

/**
 * theopen.com's card headline: the title in capitals, a slash, then the standfirst in a light weight
 * ("GENE SARAZEN / Grand Slam hero was the King of Prince's in 1932"). Built from our title and dek,
 * so no new field is needed.
 */
function SplitTitle({ article }: { article: Article }) {
  return (
    <>
      <span className="font-display font-bold uppercase transition-colors group-hover:text-primary">{article.title}</span>
      {article.dek ? (
        <>
          <span className="mx-1.5 font-light text-accent">/</span>
          <span className="font-sans font-light text-foreground/80">{article.dek}</span>
        </>
      ) : null}
    </>
  );
}

/** One of the three-across cards: picture, category, split headline, a "Read article" link. */
function StoryCard({ article }: { article: Article }) {
  return (
    <Link href={`/latest/${article.slug}`} className="group flex flex-col border border-border bg-white">
      <div className="overflow-hidden">
        <PlaceholderArt
          label={article.heroLabel}
          imageUrl={article.imageUrl}
          tone="navy"
          ratio="16/9"
          sizes="(min-width: 1430px) 442px, (min-width: 1024px) 31vw, 50vw"
          className="transition-transform duration-300 ease-standard group-hover:scale-[1.02]"
        />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <p className="font-display text-[12px] uppercase tracking-wide text-muted-foreground">{article.category}</p>
        <h3 className="text-[16px] leading-snug">
          <SplitTitle article={article} />
        </h3>
        <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-xs font-bold uppercase tracking-wide text-[#2269AB]">
          Read article <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

/** The two-across cards with the words set over the photograph, as theopen.com breaks up its grid. */
function PhotoStory({ article }: { article: Article }) {
  return (
    <Link href={`/latest/${article.slug}`} className="group relative block aspect-[6/5] overflow-hidden bg-primary">
      <PlaceholderArt
        label={article.heroLabel}
        imageUrl={article.imageUrl}
        tone="navy"
        fill
        sizes="(min-width: 1430px) 663px, 50vw"
        className="transition-transform duration-300 ease-standard group-hover:scale-[1.03]"
      />
      <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(6,5,30,0.95)_0%,rgba(6,5,30,0.6)_35%,rgba(6,5,30,0)_65%)]" />
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-6 text-white lg:p-8">
        <p className="font-display text-[13px] uppercase tracking-wide text-white/75">{article.category}</p>
        <h3 className="text-[22px] leading-snug [&_span]:!text-white lg:text-[26px]">
          <SplitTitle article={article} />
        </h3>
        <span className="mt-1 inline-flex items-center gap-1.5 self-end text-xs font-bold uppercase tracking-wide text-accent">
          Read article <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}

/** The wide story at the head of each page: words on one side, a big picture on the other. */
function LeadStory({ article, flip, priority }: { article: Article; flip: boolean; priority: boolean }) {
  return (
    <Link href={`/latest/${article.slug}`} className="group grid items-center gap-5 border-b border-border pb-8 sm:grid-cols-[1fr_1.5fr] sm:gap-10 sm:pb-12">
      <div className={cn("-mx-5 overflow-hidden sm:mx-0", flip ? "sm:order-1" : "sm:order-2")}>
        <PlaceholderArt
          label={article.heroLabel}
          imageUrl={article.imageUrl}
          tone="navy"
          ratio="16/9"
          sizes="(min-width: 1430px) 800px, (min-width: 640px) 60vw, 100vw"
          priority={priority}
          className="transition-transform duration-300 ease-standard group-hover:scale-[1.02]"
        />
      </div>
      <div className={cn("flex flex-col gap-3", flip ? "sm:order-2" : "sm:order-1")}>
        <p className="font-display text-[13px] uppercase tracking-wide text-muted-foreground">{article.category}</p>
        <h2 className="text-balance text-[24px] leading-snug sm:text-[28px]">
          <SplitTitle article={article} />
        </h2>
        <StoryMeta article={article} />
        <span className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#2269AB]">
          Read article <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

/** Phone only: a small picture on the left, the words on the right. */
function ArticleRow({ article }: { article: Article }) {
  return (
    <Link href={`/latest/${article.slug}`} className="group flex gap-4 px-5 py-4">
      <div className="w-[120px] shrink-0 overflow-hidden">
        <PlaceholderArt label={article.heroLabel} imageUrl={article.imageUrl} tone="navy" ratio="4/3" sizes="120px" />
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{article.category}</p>
        <h3 className="text-[15px] leading-snug">
          <SplitTitle article={article} />
        </h3>
        <p className="line-clamp-2 text-[13px] leading-snug text-muted-foreground">{article.dek}</p>
      </div>
    </Link>
  );
}

// The list used to live here as a hardcoded array that had to be kept in step with the enum on
// the Articles collection. It comes from the Article Categories collection now, so adding one in
// the admin adds a button here with nothing to deploy -- "All" is still prepended in code, being
// a filter rather than a category.
export function NewsListing({
  initialArticles,
  initialHasMore,
  categories,
}: {
  initialArticles: Article[];
  initialHasMore: boolean;
  categories: ArticleCategory[];
}) {
  // One category per championship ("The 14th Legs Open") would be 15+ pills, a whole phone
  // screen before the first story. Those go in a drop-down, newest first; the topics stay as pills.
  const editionOf = (cat: string) => Number(/^the (\d+)(?:st|nd|rd|th) legs open$/i.exec(cat.trim())?.[1] ?? NaN);
  const editions = categories.filter((cat) => !Number.isNaN(editionOf(cat))).sort((a, b) => editionOf(b) - editionOf(a));
  const CATEGORIES: Array<ArticleCategory | "All"> = ["All", ...categories.filter((cat) => !editions.includes(cat))];
  const [category, setCategory] = useState<ArticleCategory | "All">("All");
  const [articles, setArticles] = useState(initialArticles);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function fetchPage(nextCategory: typeof category, nextPage: number, replace: boolean) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(nextPage) });
    if (nextCategory !== "All") params.set("category", nextCategory);
    const res = await fetch(`/api/news?${params.toString()}`);
    const data: { items: Article[]; hasMore: boolean } = await res.json();
    setArticles((prev) => (replace ? data.items : [...prev, ...data.items]));
    setHasMore(data.hasMore);
    setPage(nextPage);
    setLoading(false);
  }

  function handleCategoryChange(next: typeof category) {
    setCategory(next);
    startTransition(() => {
      fetchPage(next, 1, true);
    });
  }

  const showEmpty = !loading && !isPending && articles.length === 0;

  return (
    <div className="flex flex-col gap-10">
      <div role="tablist" aria-label="Filter by category" className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            role="tab"
            type="button"
            aria-selected={category === cat}
            onClick={() => handleCategoryChange(cat)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-medium uppercase transition-colors",
              category === cat
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-transparent text-foreground hover:bg-secondary",
            )}
          >
            {cat}
          </button>
        ))}
        {editions.length > 0 ? (
          <div className="relative">
            <select
              aria-label="Filter by championship"
              value={editions.includes(category) ? category : ""}
              onChange={(e) => handleCategoryChange(e.target.value || "All")}
              className={cn(
                "cursor-pointer appearance-none rounded-full border py-2 pl-4 pr-10 text-sm font-medium uppercase transition-colors",
                editions.includes(category)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-transparent text-foreground hover:bg-secondary",
              )}
            >
              <option value="">By championship</option>
              {editions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.toUpperCase()}
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden
              className={cn(
                "pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2",
                editions.includes(category) ? "text-primary-foreground" : "text-muted-foreground",
              )}
            />
          </div>
        ) : null}
      </div>

      {showEmpty ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-20 text-center">
          <p className="font-display font-bold text-xl">No stories in this category yet</p>
          <p className="text-sm text-muted-foreground">Try a different category, or check back during championship week.</p>
        </div>
      ) : (
        (loading || isPending) && articles.length === 0 ? (
          <SectionGrid layout="thirds" className="gap-y-12 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3">
                <Skeleton className="aspect-[4/3] w-full" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-full" />
              </div>
            ))}
          </SectionGrid>
        ) : (
          // Each page of seven opens with a wide feature (picture swapping sides page to page),
          // then two rows of three -- theopen.com's rhythm, and the grid always comes out even.
          // On a phone the six become compact rows, so five or so stories fit on one screen.
          <div className="flex flex-col gap-12 sm:gap-16">
            {chunk(articles, NEWS_PAGE_SIZE).map((group, g) => (
              <div key={group[0].slug} className="flex flex-col gap-8 sm:gap-12">
                <LeadStory article={group[0]} flip={g % 2 === 1} priority={g === 0} />
                {group.length > 1 ? (
                  <>
                    <ul className="-mx-5 flex flex-col divide-y divide-border border-y border-border sm:hidden">
                      {group.slice(1).map((article) => (
                        <li key={article.slug}>
                          <ArticleRow article={article} />
                        </li>
                      ))}
                    </ul>
                    {/* theopen.com's rhythm: three cards, two photo cards, then another wide story. */}
                    <div className="hidden flex-col gap-8 sm:flex sm:gap-12">
                      {group.slice(1, 4).length > 0 ? (
                        <SectionGrid layout="thirds" className="gap-6 sm:grid-cols-2">
                          {group.slice(1, 4).map((article) => (
                            <StoryCard key={article.slug} article={article} />
                          ))}
                        </SectionGrid>
                      ) : null}
                      {group.slice(4, 6).length > 0 ? (
                        <div className="grid gap-6 sm:grid-cols-2">
                          {group.slice(4, 6).map((article) => (
                            <PhotoStory key={article.slug} article={article} />
                          ))}
                        </div>
                      ) : null}
                      {group[6] ? <LeadStory article={group[6]} flip={g % 2 === 0} priority={false} /> : null}
                    </div>
                  </>
                ) : null}
              </div>
            ))}
          </div>
        )
      )}

      {hasMore ? (
        <div className="flex justify-center">
          <Button variant="outline" size="lg" disabled={loading} onClick={() => fetchPage(category, page + 1, false)}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? "Loading more" : "Load more stories"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
