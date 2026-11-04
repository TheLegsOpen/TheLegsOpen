import { ArticleCard } from "@/components/news/article-card";
import { SponsorTimeWidget } from "@/components/shared/sponsor-time-widget";
import { cn } from "@/lib/utils";
import type { Article } from "@/types/article";
import type { SponsorClock } from "@/lib/data/sponsor-clock";

interface ChampionshipSidebarProps {
  featuredArticle: Article;
  clockConfig: SponsorClock;
  tone?: "light" | "dark";
}

export function ChampionshipSidebar({ featuredArticle, clockConfig, tone = "light" }: ChampionshipSidebarProps) {
  const isDark = tone === "dark";
  return (
    <aside className="flex flex-col gap-6">
      <SponsorTimeWidget config={clockConfig} />
      <div className="flex flex-col gap-3">
        <p
          className={cn(
            "text-xs font-semibold uppercase tracking-[0.14em]",
            isDark ? "text-surface-dark-foreground/50" : "text-muted-foreground",
          )}
        >
          Latest News
        </p>
        {/* A 455px rail, not a third of the page -- see GRID_SIZES in ArticleCard. */}
        <ArticleCard article={featuredArticle} tone={tone} sizes="(min-width: 1430px) 455px, (min-width: 1024px) 32vw, 100vw" />
      </div>
    </aside>
  );
}
