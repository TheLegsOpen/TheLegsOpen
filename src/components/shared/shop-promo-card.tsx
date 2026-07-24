import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { PlaceholderArt } from "@/components/shared/placeholder-art";
import { SITE } from "@/constants/site";
import { cn } from "@/lib/utils";

export function ShopPromoCard({ tone = "light" }: { tone?: "light" | "dark" }) {
  const isDark = tone === "dark";
  return (
    <Link
      href="/shop"
      className={cn(
        "group flex gap-4 border p-3 transition-colors",
        isDark
          ? "border-surface-dark-foreground/15 hover:border-accent/40 hover:bg-surface-dark-foreground/5"
          : "border-border hover:border-primary/30 hover:bg-secondary",
      )}
    >
      <PlaceholderArt label="Championship apparel collection" tone="gold" ratio="1/1" className="h-20 w-20 shrink-0" />
      <div className="flex flex-col justify-center gap-1">
        <p className={cn("text-[10px] font-semibold uppercase tracking-[0.14em]", isDark ? "text-surface-dark-foreground/50" : "text-muted-foreground")}>
          The Shop
        </p>
        <p className={cn("font-display font-bold leading-snug", isDark && "text-surface-dark-foreground")}>
          {SITE.currentChampionshipNumber}th Collection{" "}
          <span className={cn("font-normal", isDark ? "text-surface-dark-foreground/60" : "text-muted-foreground")}>
            — shop the range
          </span>
        </p>
        <span
          className={cn(
            "flex items-center gap-1 text-xs font-bold uppercase tracking-wide transition-colors group-hover:text-accent",
            isDark ? "text-surface-dark-foreground" : "text-primary",
          )}
        >
          Shop now <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}
