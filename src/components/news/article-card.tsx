import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { PlaceholderArt } from "@/components/shared/placeholder-art";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import type { Article } from "@/types/article";

export function ArticleCard({
  article,
  priority = false,
  tone = "light",
}: {
  article: Article;
  priority?: boolean;
  tone?: "light" | "dark";
}) {
  void priority;
  const isDark = tone === "dark";
  return (
    <Link href={`/latest/${article.slug}`} className="group flex flex-col gap-3">
      <PlaceholderArt
        label={article.heroLabel}
        imageUrl={article.imageUrl}
        tone="navy"
        ratio="4/3"
        className="transition-transform duration-300 ease-standard group-hover:scale-[1.02]"
      />
      <div className="flex flex-col gap-2">
        <Badge variant={isDark ? "accent" : "muted"} className="w-fit">
          {article.category}
        </Badge>
        <h3
          className={cn(
            "text-balance transition-colors",
            isDark
              ? "font-sans text-[24px] font-light capitalize leading-[28.8px] tracking-[0px] text-[#d9d9d9] group-hover:text-accent"
              : "font-display font-bold text-lg leading-snug group-hover:text-primary",
          )}
        >
          {article.title}
        </h3>
        <p
          className={cn(
            "line-clamp-2",
            isDark
              ? "font-sans text-[16px] font-light leading-[19px] tracking-[0px] text-white"
              : "text-sm text-muted-foreground",
          )}
        >
          {article.dek}
        </p>
        <p className={cn("text-xs", isDark ? "text-surface-dark-foreground/60" : "text-muted-foreground")}>
          {formatDate(article.publishedAt)} · {article.readTimeMinutes} min read
        </p>
        {isDark ? (
          <span className="mt-1 inline-flex w-fit items-center gap-1.5 bg-accent px-4 py-2 font-sans text-[17px] font-light uppercase leading-[20.4px] tracking-[0.3px] text-[#06051e]">
            Read more
            <ArrowUpRight className="h-4 w-4 transition-transform duration-200 ease-standard group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        ) : null}
      </div>
    </Link>
  );
}
