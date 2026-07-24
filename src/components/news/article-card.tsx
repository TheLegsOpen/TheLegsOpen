import Link from "next/link";

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
            "font-display font-bold text-lg leading-snug text-balance transition-colors",
            isDark ? "text-surface-dark-foreground group-hover:text-accent" : "group-hover:text-primary",
          )}
        >
          {article.title}
        </h3>
        <p className={cn("line-clamp-2 text-sm", isDark ? "text-surface-dark-foreground/70" : "text-muted-foreground")}>
          {article.dek}
        </p>
        <p className={cn("text-xs", isDark ? "text-surface-dark-foreground/60" : "text-muted-foreground")}>
          {formatDate(article.publishedAt)} · {article.readTimeMinutes} min read
        </p>
      </div>
    </Link>
  );
}
