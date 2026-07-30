"use client";

import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";

import { CountryFlag } from "@/components/shared/country-flag";
import { formatToPar } from "@/lib/leaderboard";
import { cn, playerSlug, splitSurnameFirst } from "@/lib/utils";
import { scorePillClass, TILE_CLASS, NEUTRAL_TILE_CLASS } from "@/components/leaderboard/leaderboard-table";
import type { CompetitionEntry } from "@/lib/data/scorecards";

const WIDGET_ROW_COUNT = 10;
/** Denser padding than the full leaderboard's tiles, to suit the narrower homepage column. */
const COMPACT_TILE_CLASS = "px-1.5 py-0.5 min-w-0";

interface LeaderboardWidgetProps {
  entries: CompetitionEntry[];
}

export function LeaderboardWidget({ entries }: LeaderboardWidgetProps) {
  const top = entries.slice(0, WIDGET_ROW_COUNT);

  return (
    <div className="border border-surface-dark-foreground/15">
      <div className="bg-primary px-5 py-3">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-primary-foreground">Leaderboard</h2>
      </div>

      {top.length === 0 ? (
        <p className="p-5 text-sm text-surface-dark-foreground/60">The field will appear here once tee times are generated.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-surface-dark-foreground/15 bg-surface-dark-foreground/5 text-left text-xs uppercase tracking-wide text-surface-dark-foreground/60">
                <th className="px-2 py-2">Pos</th>
                <th className="px-2 py-2">Player</th>
                <th className="px-2 py-2 text-right" aria-label="Tee time" />
                <th className="px-2 py-2 text-right">Par</th>
                <th className="px-2 py-2 text-right">Hole</th>
              </tr>
            </thead>
            <tbody>
              {top.map((entry) => {
                const { surname, firstName } = splitSurnameFirst(entry.player.name);
                return (
                  <tr key={entry.player.id} className="bg-accent/90 text-accent-foreground hover:bg-accent">
                    <td className="px-2 py-2 tabular-nums">
                      {entry.tied ? "T" : ""}
                      {entry.position}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <Link href={`/players/${playerSlug(entry.player)}`} className="hover:underline">
                        <span className="font-bold">{surname}</span>
                        <span className="font-normal">, {firstName}</span>
                      </Link>
                      <CountryFlag code={entry.player.countryCode} className="ml-2 h-3 w-4 align-middle" />
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-right text-xs tabular-nums text-accent-foreground/70">
                      {!entry.started && entry.teeTime ? (
                        <span className="inline-flex items-center justify-end gap-1.5 leading-none">
                          <Clock className="h-3 w-3 shrink-0" />
                          {entry.teeTime}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-2 py-2 text-right">
                      {entry.toPar !== undefined ? (
                        <span className={cn(TILE_CLASS, COMPACT_TILE_CLASS, scorePillClass(entry.toPar))}>
                          {formatToPar(entry.toPar)}
                        </span>
                      ) : (
                        <span className="text-accent-foreground/50">—</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      <span className={cn(TILE_CLASS, COMPACT_TILE_CLASS, NEUTRAL_TILE_CLASS)}>{entry.thru}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Link
        href="/leaderboard"
        className="flex items-center justify-between bg-primary px-5 py-3 text-sm font-bold uppercase tracking-wide text-accent transition-colors hover:text-accent/80"
      >
        Full leaderboard
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
