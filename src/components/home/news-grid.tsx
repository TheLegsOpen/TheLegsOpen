"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

import { ArticleCard } from "@/components/news/article-card";
import { SectionHeading } from "@/components/shared/section-heading";
import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Article } from "@/types/article";

export function NewsGrid({ initialArticles, initialHasMore }: { initialArticles: Article[]; initialHasMore: boolean }) {
  const [articles, setArticles] = useState(initialArticles);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  async function loadMore() {
    setLoading(true);
    const nextPage = page + 1;
    const res = await fetch(`/api/news?page=${nextPage}`);
    const data: { items: Article[]; hasMore: boolean } = await res.json();
    setArticles((prev) => [...prev, ...data.items]);
    setHasMore(data.hasMore);
    setPage(nextPage);
    setLoading(false);
  }

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

        <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article, index) => (
            <motion.div
              key={article.slug}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.4, delay: (index % 3) * 0.06 }}
            >
              <ArticleCard article={article} tone="dark" />
            </motion.div>
          ))}
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-3">
                  <Skeleton className="aspect-[4/3] w-full bg-surface-dark-foreground/10" />
                  <Skeleton className="h-4 w-24 bg-surface-dark-foreground/10" />
                  <Skeleton className="h-5 w-full bg-surface-dark-foreground/10" />
                  <Skeleton className="h-4 w-2/3 bg-surface-dark-foreground/10" />
                </div>
              ))
            : null}
        </div>

        {hasMore ? (
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="lg"
              onClick={loadMore}
              disabled={loading}
              className="border-surface-dark-foreground/30 text-surface-dark-foreground hover:bg-surface-dark-foreground/10"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? "Loading more" : "Load more stories"}
            </Button>
          </div>
        ) : null}
      </Container>
    </section>
  );
}
