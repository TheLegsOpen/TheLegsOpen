"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { ArticleCard } from "@/components/news/article-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Article, ArticleCategory } from "@/types/article";

const CATEGORIES: Array<ArticleCategory | "All"> = [
  "All",
  "Championship News",
  "Player Features",
  "History",
  "Tickets",
  "Course Guide",
];

export function NewsListing({ initialArticles, initialHasMore }: { initialArticles: Article[]; initialHasMore: boolean }) {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All");
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
              "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              category === cat
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-transparent text-foreground hover:bg-secondary",
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {showEmpty ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-20 text-center">
          <p className="font-display font-bold text-xl">No stories in this category yet</p>
          <p className="text-sm text-muted-foreground">Try a different category, or check back during championship week.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {(loading || isPending) && articles.length === 0
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-3">
                  <Skeleton className="aspect-[4/3] w-full" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-full" />
                </div>
              ))
            : articles.map((article) => <ArticleCard key={article.slug} article={article} />)}
        </div>
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
