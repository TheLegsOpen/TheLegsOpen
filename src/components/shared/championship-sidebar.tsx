import { ArticleCard } from "@/components/news/article-card";
import { ShopPromoCard } from "@/components/shared/shop-promo-card";
import { SponsorTimeWidget } from "@/components/shared/sponsor-time-widget";
import { cn } from "@/lib/utils";
import type { Article } from "@/types/article";

interface ChampionshipSidebarProps {
  featuredArticle: Article;
  tone?: "light" | "dark";
}

export function ChampionshipSidebar({ featuredArticle, tone = "light" }: ChampionshipSidebarProps) {
  const isDark = tone === "dark";
  return (
    <aside className="flex flex-col gap-6">
      <SponsorTimeWidget />
      <ShopPromoCard tone={tone} />
      <div className="flex flex-col gap-3">
        <p
          className={cn(
            "text-xs font-semibold uppercase tracking-[0.14em]",
            isDark ? "text-surface-dark-foreground/50" : "text-muted-foreground",
          )}
        >
          Latest News
        </p>
        <ArticleCard article={featuredArticle} tone={tone} />
      </div>
    </aside>
  );
}
