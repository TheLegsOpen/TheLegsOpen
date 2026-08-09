"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";

import { CountryFlag } from "@/components/shared/country-flag";
import { PlayerPopup } from "@/components/leaderboard/player-popup";
import { useFavorites } from "@/hooks/use-favorites";
import { formatToPar, isConcluded } from "@/lib/leaderboard";
import { cn, splitSurnameFirst } from "@/lib/utils";
import { scorePillClass, TILE_CLASS, NEUTRAL_TILE_CLASS } from "@/components/leaderboard/leaderboard-table";
import type { RankedEntry } from "@/lib/data/playoffs";
import type { CompetitionEntry, Competition } from "@/lib/data/scorecards";
import type { StatCategory } from "@/lib/statistics";

const WIDGET_ROW_COUNT = 10;
/** Denser padding than the full leaderboard's tiles, to suit the narrower homepage column. Fixed (not minimum) width, so "-1" and "+15" render the same size instead of the pill growing/shrinking with digit count. */
const COMPACT_TILE_CLASS = "px-1.5 py-0.5 w-10";

interface LeaderboardWidgetProps {
  entries: RankedEntry[];
  stableford: CompetitionEntry[];
  scratch: CompetitionEntry[];
  nettCategories: StatCategory[];
  scratchCategories: StatCategory[];
  streakCategories: StatCategory[];
  drivingCategories: StatCategory[];
  approachCategories: StatCategory[];
  puttingCategories: StatCategory[];
  championBadgeUrl?: string;
}

export function LeaderboardWidget({
  entries,
  stableford,
  scratch,
  nettCategories,
  scratchCategories,
  streakCategories,
  drivingCategories,
  approachCategories,
  puttingCategories,
  championBadgeUrl,
}: LeaderboardWidgetProps) {
  const top = entries.slice(0, WIDGET_ROW_COUNT);
  const { favorites, toggleFavorite } = useFavorites();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [popupCompetition, setPopupCompetition] = useState<Competition>("main");
  const concluded = isConcluded(entries);

  const selectedMain = entries.find((e) => e.player.id === selectedPlayerId);
  const selectedStableford = stableford.find((e) => e.player.id === selectedPlayerId);
  const selectedScratch = scratch.find((e) => e.player.id === selectedPlayerId);
  const leaderToPar = entries[0]?.toPar ?? 0;

  return (
    <div className="flex h-full flex-col border border-surface-dark-foreground/15">
      <div className="bg-primary px-5 py-3">
        <h2 className="font-menu text-sm font-bold uppercase tracking-wide text-primary-foreground">Leaderboard</h2>
      </div>

      {top.length === 0 ? (
        <p className="flex-1 bg-primary p-5 text-sm text-surface-dark-foreground/60">The field will appear here once tee times are generated.</p>
      ) : (
        <div className="flex-1 overflow-x-auto bg-primary">
          <table className="w-full table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-8" />
              <col />
              <col className="w-14" />
              <col className="w-12" />
              <col className="w-12" />
              <col className="w-12" />
            </colgroup>
            <thead>
              <tr className="border-b border-surface-dark-foreground/15 bg-surface-dark-foreground/5 text-left text-xs uppercase tracking-wide text-surface-dark-foreground/60">
                <th className="px-2 py-2">Pos</th>
                <th className="px-2 py-2">Player</th>
                <th className="px-2 py-2 text-right" aria-label="Tee time" />
                <th className="px-2 py-2 text-right">Par</th>
                <th className="px-2 py-2 text-right">Hole</th>
                <th className="px-2 py-2 text-right">Score</th>
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
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPlayerId(entry.player.id);
                            setPopupCompetition("main");
                          }}
                          className="truncate hover:underline"
                        >
                          <span className="font-bold">{surname}</span>
                          <span className="font-normal">, {firstName}</span>
                        </button>
                        <CountryFlag code={entry.player.countryCode} className="h-3 w-4 shrink-0 align-middle" />
                        {concluded && entry.position === 1 && !entry.tied && championBadgeUrl ? (
                          <img src={championBadgeUrl} alt="Champion" className="h-3.5 w-3.5 shrink-0 object-contain" />
                        ) : null}
                      </div>
                      {entry.playoffNote ? (
                        <p
                          className={cn(
                            "mt-0.5 truncate text-[9px] font-bold uppercase tracking-wide",
                            entry.playoffNote.won ? "text-primary" : "text-primary/60",
                          )}
                        >
                          {entry.playoffNote.label}
                        </p>
                      ) : null}
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
                    <td className="px-2 py-2 text-right tabular-nums">
                      <span className={cn(TILE_CLASS, COMPACT_TILE_CLASS, NEUTRAL_TILE_CLASS)}>
                        {entry.started && entry.score !== undefined ? entry.score : "-"}
                      </span>
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

      <PlayerPopup
        main={selectedMain}
        stableford={selectedStableford}
        scratch={selectedScratch}
        nettCategories={nettCategories}
        scratchCategories={scratchCategories}
        streakCategories={streakCategories}
        drivingCategories={drivingCategories}
        approachCategories={approachCategories}
        puttingCategories={puttingCategories}
        initialCompetition={popupCompetition}
        leaderToPar={leaderToPar}
        isFav={selectedPlayerId ? favorites.includes(selectedPlayerId) : false}
        onToggleFavorite={() => selectedPlayerId && toggleFavorite(selectedPlayerId)}
        open={!!selectedMain}
        onOpenChange={(next) => {
          if (!next) setSelectedPlayerId(null);
        }}
      />
    </div>
  );
}
