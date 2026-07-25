"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { PlayerPopup } from "@/components/leaderboard/player-popup";
import { CountryFlag } from "@/components/shared/country-flag";
import { formatToPar } from "@/lib/leaderboard";
import { cn, surnameFirst } from "@/lib/utils";
import type { LeaderboardEntry } from "@/types/player";
import type { StatCategory } from "@/lib/statistics";
import type { Article } from "@/types/article";

const TOP_BAND_SIZE = 3;

function scorePillClass(scoreToPar: number): string {
  if (scoreToPar < 0) return "bg-destructive text-white";
  if (scoreToPar === 0) return "bg-primary text-primary-foreground";
  return "bg-surface-dark-foreground/15 text-surface-dark-foreground";
}

interface LeaderboardWidgetProps {
  entries: LeaderboardEntry[];
  statCategories: StatCategory[];
  articles: Article[];
  competitionComplete: boolean;
}

export function LeaderboardWidget({ entries: top, statCategories, articles, competitionComplete }: LeaderboardWidgetProps) {
  const leaderScoreToPar = top.find((e) => e.position === 1)?.scoreToPar ?? 0;
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const selectedEntry = top.find((e) => e.player.id === selectedPlayerId);

  return (
    <section className="bg-surface-dark bg-dashboard-pattern py-16 text-surface-dark-foreground sm:py-24">
      <Container className="flex flex-col gap-8">
        <div className="flex items-end justify-between gap-6">
          <SectionHeading tone="dark" eyebrow="Championship Week" title="Leaderboard" />
          <Link
            href="/leaderboard"
            className="hidden shrink-0 items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-accent transition-colors hover:text-accent/80 sm:flex"
          >
            Full leaderboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="overflow-x-auto border border-surface-dark-foreground/15">
          <table className="w-full min-w-[420px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-surface-dark-foreground/15 bg-surface-dark-foreground/5 text-left text-xs uppercase tracking-wide text-surface-dark-foreground/60">
                <th className="px-4 py-3">Pos</th>
                <th className="px-2 py-3">Player</th>
                <th className="px-2 py-3 text-right">To Par</th>
                <th className="px-4 py-3 text-right">Thru</th>
              </tr>
            </thead>
            <tbody>
              {top.map((entry, index) => {
                const isTopBand = competitionComplete && index < TOP_BAND_SIZE;
                const displayName = isTopBand ? entry.player.name : surnameFirst(entry.player.name);
                return (
                  <tr
                    key={entry.player.id}
                    className={cn(
                      "border-b border-surface-dark-foreground/15 text-accent-foreground last:border-0",
                      isTopBand ? "bg-gradient-to-br from-[#f4c430] via-accent to-[#c2571a]" : "bg-accent/90 hover:bg-accent",
                    )}
                  >
                    <td className={cn("px-4 py-3 tabular-nums", isTopBand && "font-bold")}>
                      {entry.tied ? "T" : ""}
                      {entry.position}
                    </td>
                    <td className="px-2 py-3">
                      <button
                        type="button"
                        onClick={() => setSelectedPlayerId(entry.player.id)}
                        className={cn("hover:underline", isTopBand ? "font-display font-bold" : "font-medium")}
                      >
                        {displayName}
                      </button>
                      <CountryFlag code={entry.player.countryCode} className="ml-2 h-3 w-4 align-middle" />
                    </td>
                    <td className="px-2 py-3 text-right">
                      <span
                        className={cn(
                          "inline-block min-w-[2.75rem] rounded px-2 py-1 text-xs font-bold tabular-nums",
                          scorePillClass(entry.scoreToPar),
                        )}
                      >
                        {formatToPar(entry.scoreToPar)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-accent-foreground/80">{entry.thru}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Link
          href="/leaderboard"
          className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-accent sm:hidden"
        >
          Full leaderboard
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Container>

      <PlayerPopup
        entry={selectedEntry}
        leaderScoreToPar={leaderScoreToPar}
        statCategories={statCategories}
        articles={articles}
        open={!!selectedEntry}
        onOpenChange={(next) => {
          if (!next) setSelectedPlayerId(null);
        }}
      />
    </section>
  );
}
