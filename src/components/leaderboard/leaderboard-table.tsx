"use client";

import { Fragment, useState } from "react";
import { Star, ChevronUp, ChevronDown } from "lucide-react";

import { cn, ordinal, surnameFirst } from "@/lib/utils";
import { formatToPar, holeScoreClass, synthesizeHoleScores, synthesizeMovement } from "@/lib/leaderboard";
import { PlayerPopup } from "@/components/leaderboard/player-popup";
import { PlaceholderArt } from "@/components/shared/placeholder-art";
import { SITE } from "@/constants/site";
import type { LeaderboardEntry } from "@/types/player";
import type { StatCategory } from "@/lib/statistics";
import type { Article } from "@/types/article";

const COURSE_PAR = 72;
const TOP_BAND_SIZE = 3;

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  favorites: string[];
  onToggleFavorite: (playerId: string) => void;
  favoritesOnly: boolean;
  statCategories: StatCategory[];
  articles: Article[];
  competitionComplete: boolean;
}

function MovementIndicator({ seedKey }: { seedKey: string }) {
  const movement = synthesizeMovement(seedKey);
  if (movement === 0) return <span className="inline-block w-3 text-center text-xs">–</span>;
  const Icon = movement > 0 ? ChevronUp : ChevronDown;
  return (
    <span className="inline-flex items-center text-xs font-medium">
      <Icon className="h-3 w-3" />
      {Math.abs(movement)}
    </span>
  );
}

function scorePillClass(scoreToPar: number): string {
  if (scoreToPar < 0) return "bg-destructive text-white";
  if (scoreToPar === 0) return "bg-primary text-primary-foreground";
  return "bg-surface-dark-foreground/15 text-surface-dark-foreground";
}

export function LeaderboardTable({
  entries,
  favorites,
  onToggleFavorite,
  favoritesOnly,
  statCategories,
  articles,
  competitionComplete,
}: LeaderboardTableProps) {
  const visible = favoritesOnly ? entries.filter((entry) => favorites.includes(entry.player.id)) : entries;
  const roundCount = entries[0]?.rounds.length ?? 0;
  const columnCount = roundCount + 7;
  const leaderScoreToPar = entries.find((e) => e.position === 1)?.scoreToPar ?? 0;
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const selectedEntry = entries.find((e) => e.player.id === selectedPlayerId);

  if (visible.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-surface-dark-foreground/20 py-16 text-center">
        <p className="font-display font-bold text-lg">No favorites on the leaderboard</p>
        <p className="text-sm text-surface-dark-foreground/60">Star a player to track them here.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-surface-dark-foreground/15">
      <table className="w-full min-w-[680px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-surface-dark-foreground/15 bg-surface-dark-foreground/5 text-left text-xs uppercase tracking-wide text-surface-dark-foreground/60">
            <th className="w-10 px-4 py-3" aria-label="Favorite" />
            <th className="px-2 py-3">Pos</th>
            <th className="px-2 py-3">Player</th>
            {Array.from({ length: roundCount }).map((_, i) => (
              <th key={i} className="px-2 py-3 text-right">
                R{i + 1}
              </th>
            ))}
            <th className="px-2 py-3 text-right">Total</th>
            <th className="px-2 py-3 text-right">To Par</th>
            <th className="px-2 py-3 text-right">Hole</th>
            <th className="px-4 py-3 text-right">Round</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((entry, index) => {
            const isFav = favorites.includes(entry.player.id);
            const isTopBand = !favoritesOnly && competitionComplete && index < TOP_BAND_SIZE;
            const isChampion = isTopBand && entry.position === 1;
            const displayName = isTopBand ? entry.player.name : surnameFirst(entry.player.name);
            const todayToPar = entry.rounds[roundCount - 1] - COURSE_PAR;

            if (isChampion) {
              return (
                <Fragment key={entry.player.id}>
                  <tr className="border-b border-surface-dark-foreground/15 bg-gradient-to-br from-[#f4c430] via-accent to-[#c2571a] text-accent-foreground">
                    <td colSpan={columnCount} className="p-0">
                      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
                        <PlaceholderArt
                          label={`${entry.player.name} portrait`}
                          tone="gold"
                          ratio="4/3"
                          className="w-full sm:w-48 sm:shrink-0"
                        />
                        <div className="flex flex-1 flex-col gap-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-bold uppercase tracking-[0.14em] text-primary/70">
                              {ordinal(SITE.currentChampionshipNumber)} The Legs Open Champion
                            </span>
                            <span
                              className={cn(
                                "inline-block min-w-[3rem] rounded px-2.5 py-1 text-sm font-bold tabular-nums",
                                scorePillClass(entry.scoreToPar),
                              )}
                            >
                              {formatToPar(entry.scoreToPar)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedPlayerId(entry.player.id)}
                            className="text-left hover:underline"
                          >
                            <span className="block font-display text-lg">{entry.player.name.split(" ")[0]}</span>
                            <span className="-mt-1 block font-display text-3xl font-bold uppercase sm:text-4xl">
                              {entry.player.name.split(" ").slice(1).join(" ")}
                            </span>
                          </button>
                          <span className="text-sm text-primary/70">{entry.player.country}</span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {synthesizeHoleScores(todayToPar, `${entry.player.id}-${roundCount}`).map((score, holeIndex) => (
                              <span
                                key={holeIndex}
                                title={`Hole ${holeIndex + 1}: ${formatToPar(score)}`}
                                className={cn("h-3 w-3", holeScoreClass(score))}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                </Fragment>
              );
            }

            return (
              <Fragment key={entry.player.id}>
                <tr
                  className={cn(
                    "border-b border-surface-dark-foreground/15 text-accent-foreground last:border-0",
                    isTopBand ? "bg-gradient-to-br from-[#f4c430] via-accent to-[#c2571a]" : "bg-accent/90 hover:bg-accent",
                  )}
                >
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => onToggleFavorite(entry.player.id)}
                      aria-pressed={isFav}
                      aria-label={`${isFav ? "Remove" : "Add"} ${entry.player.name} ${isFav ? "from" : "to"} favorites`}
                      className="text-accent-foreground/70 transition-colors hover:text-primary"
                    >
                      <Star className={cn("h-4 w-4", isFav && "fill-current text-current")} />
                    </button>
                  </td>
                  <td className={cn("px-2 py-3 tabular-nums", isTopBand && "font-bold")}>
                    <div className="flex items-center gap-1.5">
                      <span>
                        {entry.tied ? "T" : ""}
                        {entry.position}
                      </span>
                      <MovementIndicator seedKey={`${entry.player.id}-${entry.position}`} />
                    </div>
                  </td>
                  <td className="px-2 py-3">
                    <button
                      type="button"
                      onClick={() => setSelectedPlayerId(entry.player.id)}
                      className={cn("hover:underline", isTopBand ? "font-display font-bold" : "font-medium")}
                    >
                      {displayName}
                    </button>
                    {entry.player.isAmateur ? <span className="ml-1.5 text-xs text-accent-foreground/70">(a)</span> : null}
                    <span className="ml-2 text-xs text-accent-foreground/70">{entry.player.countryCode}</span>
                  </td>
                  {entry.rounds.map((round, i) => (
                    <td key={i} className="px-2 py-3 text-right tabular-nums text-accent-foreground/80">
                      {round}
                    </td>
                  ))}
                  <td className="px-2 py-3 text-right font-medium tabular-nums">{entry.total}</td>
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
                  <td className="px-2 py-3 text-right tabular-nums text-accent-foreground/80">{entry.thru}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-accent-foreground/80">{formatToPar(todayToPar)}</td>
                </tr>
                {isTopBand ? (
                  <tr key={`${entry.player.id}-holes`} className="border-b border-surface-dark-foreground/15 bg-primary">
                    <td colSpan={columnCount} className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-xs font-semibold uppercase tracking-wide text-primary-foreground/60">
                          Hole by hole, R{roundCount}
                        </span>
                        <div className="flex gap-1">
                          {synthesizeHoleScores(todayToPar, `${entry.player.id}-${roundCount}`).map((score, holeIndex) => (
                            <span
                              key={holeIndex}
                              title={`Hole ${holeIndex + 1}: ${formatToPar(score)}`}
                              className={cn("h-3 w-3", holeScoreClass(score))}
                            />
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
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
    </div>
  );
}
