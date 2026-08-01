"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { CountryFlag } from "@/components/shared/country-flag";
import { cn, playerSlug, surnameFirst } from "@/lib/utils";
import { scorePillClass, TILE_CLASS, NEUTRAL_TILE_CLASS } from "@/components/leaderboard/leaderboard-table";
import type { StatCategory } from "@/lib/statistics";

const PREVIEW_COUNT = 3;

export function StatPreviewCard({ category }: { category: StatCategory }) {
  const top = category.rows.slice(0, PREVIEW_COUNT);

  return (
    <div className="flex flex-col gap-px overflow-hidden border border-surface-dark-foreground/15">
      <div className="flex items-center justify-between gap-4 bg-primary px-4 py-3">
        <h3 className="font-display text-lg font-bold uppercase tracking-wide text-primary-foreground">{category.title}</h3>
        <Link
          href={`/statistics/${category.key}`}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary-foreground/30 px-4 py-2 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-colors hover:border-accent hover:text-accent"
        >
          Full rankings <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="flex items-center justify-between bg-surface-dark-foreground/5 px-4 py-2 text-xs font-bold uppercase tracking-wide text-surface-dark-foreground/60">
        <span>Rank</span>
        <span>{category.columnLabel}</span>
      </div>

      {top.length === 0 ? (
        <div className="flex flex-col items-center gap-1 bg-primary py-8 text-center">
          <p className="text-sm text-primary-foreground/60">No holes of this par played yet.</p>
        </div>
      ) : (
        top.map((row) => (
          <div
            key={row.player.id}
            className="flex items-center justify-between gap-4 border-b border-surface-dark-foreground/15 bg-accent/90 px-4 py-3 text-accent-foreground last:border-0"
          >
            <div className="flex items-center gap-3 text-sm">
              <span className="w-8 tabular-nums">
                {row.tied ? "T" : ""}
                {row.position}
              </span>
              <CountryFlag code={row.player.countryCode} className="h-3 w-4" />
              <Link href={`/players/${playerSlug(row.player)}`} className="font-medium hover:underline">
                {surnameFirst(row.player.name)}
              </Link>
            </div>
            <span className={cn(TILE_CLASS, "text-xs", category.useParColoring ? scorePillClass(row.value) : NEUTRAL_TILE_CLASS)}>
              {row.display}
            </span>
          </div>
        ))
      )}
    </div>
  );
}
