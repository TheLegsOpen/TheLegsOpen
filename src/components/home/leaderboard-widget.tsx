"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { CountryFlag } from "@/components/shared/country-flag";
import { formatToPar } from "@/lib/leaderboard";
import { cn, playerSlug, splitSurnameFirst } from "@/lib/utils";
import { scorePillClass, TILE_CLASS, NEUTRAL_TILE_CLASS } from "@/components/leaderboard/leaderboard-table";
import type { CompetitionEntry } from "@/lib/data/scorecards";

const WIDGET_ROW_COUNT = 10;
/** Denser padding than the full leaderboard's tiles, to suit the narrower 1/3-width column. */
const COMPACT_TILE_CLASS = "px-1.5 py-0.5 min-w-0";

interface LeaderboardWidgetProps {
  entries: CompetitionEntry[];
}

export function LeaderboardWidget({ entries }: LeaderboardWidgetProps) {
  const top = entries.slice(0, WIDGET_ROW_COUNT);

  return (
    <section className="bg-surface-dark bg-dashboard-pattern py-16 text-surface-dark-foreground sm:py-24">
      <Container>
        <div className="w-full lg:w-1/3">
          <div className="mb-6 flex items-end justify-between gap-6">
            <SectionHeading tone="dark" eyebrow="Championship Week" title="Leaderboard" />
          </div>

          {top.length === 0 ? (
            <p className="text-sm text-surface-dark-foreground/60">The field will appear here once tee times are generated.</p>
          ) : (
            <div className="overflow-x-auto border border-surface-dark-foreground/15">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-surface-dark-foreground/15 bg-surface-dark-foreground/5 text-left text-xs uppercase tracking-wide text-surface-dark-foreground/60">
                    <th className="px-2 py-2">Pos</th>
                    <th className="px-2 py-2">Player</th>
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
            className="mt-4 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-accent transition-colors hover:text-accent/80"
          >
            Full leaderboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Container>
    </section>
  );
}
