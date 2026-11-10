"use client";

import Link from "next/link";
import { ChevronRight, Star } from "lucide-react";

import { CountryFlag } from "@/components/shared/country-flag";
import { cn, ordinal, splitSurnameFirst, surnameFirst } from "@/lib/utils";
import { scorePillClass, TILE_CLASS, NEUTRAL_TILE_CLASS } from "@/components/leaderboard/leaderboard-table";
import type { StatCategory, StatRow } from "@/lib/statistics";

const PREVIEW_COUNT = 3;

/** A percentage stat ("62%") gets a ring chart in the leader's row; anything else does not. */
function percentOf(display: string): number | undefined {
  const match = display.trim().match(/^(\d+(?:\.\d+)?)%$/);
  return match ? Math.min(100, Number(match[1])) : undefined;
}

function Ring({ percent }: { percent: number }) {
  const r = 22;
  const circumference = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 56 56" className="h-14 w-14 shrink-0" role="img" aria-label={`${percent}%`}>
      <circle cx="28" cy="28" r={r} fill="none" strokeWidth="5" className="stroke-primary-foreground/15" />
      <circle
        cx="28"
        cy="28"
        r={r}
        fill="none"
        strokeWidth="5"
        strokeLinecap="round"
        className="stroke-accent"
        strokeDasharray={`${(percent / 100) * circumference} ${circumference}`}
        transform="rotate(-90 28 28)"
      />
      <text x="28" y="32" textAnchor="middle" className="fill-primary-foreground text-[11px] font-bold">
        {Math.round(percent)}%
      </text>
    </svg>
  );
}

/**
 * The first-placed row, given theopen.com's treatment: on the dark card, a large ordinal and name
 * with the flag, a ring chart for a percentage stat, and the value in a large yellow box. The
 * other two places keep the slim yellow rows beneath.
 */
function LeaderRow({ row, category, onSelectPlayer }: { row: StatRow; category: StatCategory; onSelectPlayer: (playerId: string) => void }) {
  const { surname, firstName } = splitSurnameFirst(row.player.name);
  const percent = percentOf(row.display);
  return (
    <div className="flex items-center gap-4 border-b border-surface-dark-foreground/15 bg-primary px-4 py-4 text-primary-foreground">
      <span className="w-12 shrink-0 font-menu text-[22px] leading-none">
        {row.tied ? "T" : ""}
        {ordinal(row.position ?? 1)}
      </span>
      <button type="button" onClick={() => onSelectPlayer(row.player.id)} className="min-w-0 flex-1 text-left hover:underline">
        <span className="block truncate font-menu text-[15px] leading-tight">{firstName}</span>
        <span className="flex items-center gap-2 font-menu text-[24px] font-bold uppercase leading-none">
          <span className="truncate">{surname}</span>
          <CountryFlag code={row.player.countryCode} className="h-3.5 w-5 shrink-0" />
        </span>
      </button>
      {percent !== undefined ? <Ring percent={percent} /> : null}
      <span
        className={cn(
          "shrink-0 px-3 py-2 font-menu text-[22px] font-bold tabular-nums leading-none",
          category.useParColoring ? scorePillClass(row.value) : "bg-accent text-accent-foreground",
        )}
      >
        {row.display}
      </span>
    </div>
  );
}

export function StatPreviewCard({
  category,
  onSelectPlayer,
  championshipYear,
  highlightId,
  favoriteIds = [],
}: {
  category: StatCategory;
  onSelectPlayer: (playerId: string) => void;
  /** Pass when showing a specific past championship (e.g. Previous Opens) so "Full rankings" links to that year's detail page instead of whichever championship is currently active. */
  championshipYear?: number;
  /** PREVIEW (12): the player picked in the Player filter -- ringed, and added below the top three if outside them. */
  highlightId?: string;
  /** PREVIEW (28): My players, starred in the rows. */
  favoriteIds?: string[];
}) {
  const top = category.rows.slice(0, PREVIEW_COUNT);
  const extra = highlightId && !top.some((r) => r.player.id === highlightId) ? category.rows.find((r) => r.player.id === highlightId) : undefined;

  return (
    <div className="flex flex-col gap-px overflow-hidden border border-surface-dark-foreground/15">
      <div className="flex items-center justify-between gap-4 bg-primary px-4 py-3">
        <h3 className="font-display text-lg font-bold uppercase tracking-wide text-primary-foreground">{category.title}</h3>
        <Link
          href={championshipYear ? `/statistics/${category.key}?year=${championshipYear}` : `/statistics/${category.key}`}
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
        [...top, ...(extra ? [extra] : [])].map((row, index) => index === 0 ? (
          <LeaderRow key={row.player.id} row={row} category={category} onSelectPlayer={onSelectPlayer} />
        ) : (
          <div
            key={row.player.id}
            className={cn(
              "flex items-center justify-between gap-4 border-b border-surface-dark-foreground/15 bg-accent/90 px-4 py-3 text-accent-foreground last:border-0",
              row.player.id === highlightId && "ring-2 ring-inset ring-primary",
              row === extra && "border-t-4 border-t-primary",
            )}
          >
            <div className="flex items-center gap-3 text-sm">
              <span className="w-8 tabular-nums">
                {row.tied ? "T" : ""}
                {row.position}
              </span>
              <CountryFlag code={row.player.countryCode} className="h-3 w-4" />
              <button type="button" onClick={() => onSelectPlayer(row.player.id)} className="inline-flex items-center gap-1.5 font-medium hover:underline">
                {favoriteIds.includes(row.player.id) ? <Star className="h-3 w-3 fill-primary text-primary" aria-label="My player" /> : null}
                {surnameFirst(row.player.name)}
              </button>
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
