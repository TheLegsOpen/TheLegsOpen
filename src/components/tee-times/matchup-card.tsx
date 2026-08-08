import { Flag, Star } from "lucide-react";

import { PlaceholderArt } from "@/components/shared/placeholder-art";
import { CountryFlag } from "@/components/shared/country-flag";
import { formatToPar } from "@/lib/leaderboard";
import { cn, splitSurnameFirst } from "@/lib/utils";
import { scorePillClass, TILE_CLASS, NEUTRAL_TILE_CLASS } from "@/components/leaderboard/leaderboard-table";
import type { TeeTimeEntry } from "@/types/championship";
import type { Player } from "@/types/player";
import type { CompetitionEntry } from "@/lib/data/scorecards";

/**
 * A tee-time group plays together, so its status is read off whichever member has progressed
 * furthest: not yet teed off (show the tee time), mid-round (show the furthest hole reached),
 * or every member finished (show "Finished round").
 */
function groupStatus(
  players: Player[],
  mainEntries: CompetitionEntry[],
): { kind: "upcoming" } | { kind: "finished" } | { kind: "in-progress"; thru: number } {
  const entries = players.map((player) => mainEntries.find((entry) => entry.player.id === player.id)).filter((entry) => entry?.started);

  if (entries.length === 0) return { kind: "upcoming" };
  if (entries.every((entry) => entry!.thru === "F")) return { kind: "finished" };

  const thru = Math.max(...entries.map((entry) => (entry!.thru === "F" ? 18 : Number(entry!.thru) || 0)));
  return { kind: "in-progress", thru };
}

function PlayerChip({
  player,
  isFavorite,
  isDark,
  entry,
  onSelectPlayer,
}: {
  player: Player;
  isFavorite: boolean;
  isDark: boolean;
  entry: CompetitionEntry | undefined;
  onSelectPlayer: (playerId: string) => void;
}) {
  const { firstName, surname } = splitSurnameFirst(player.name);

  return (
    <div className="flex flex-1 items-center justify-between gap-4">
      <div className="flex flex-col items-start gap-2">
        <button
          type="button"
          onClick={() => onSelectPlayer(player.id)}
          className="flex flex-col items-start text-left leading-tight hover:text-accent"
        >
          <span className="flex items-center gap-1.5 font-display text-sm">
            {isFavorite ? <Star className="h-3 w-3 shrink-0 fill-accent text-accent" aria-hidden="true" /> : null}
            {firstName}
          </span>
          <span className="font-display text-lg font-bold uppercase tracking-wide hover:underline">
            {surname}
            {player.championshipHandicap !== undefined ? (
              <span className="ml-1 text-sm font-normal normal-case tracking-normal">({player.championshipHandicap})</span>
            ) : null}
          </span>
        </button>
        <p
          className={cn(
            "flex items-center gap-1.5 text-xs uppercase tracking-wide",
            isDark ? "text-surface-dark-foreground/60" : "text-muted-foreground",
          )}
        >
          <CountryFlag code={player.countryCode} className="h-2.5 w-3.5" />
          {player.country}
        </p>
        {entry?.started ? (
          <span
            className={cn(TILE_CLASS, "w-fit", entry.toPar !== undefined ? scorePillClass(entry.toPar) : NEUTRAL_TILE_CLASS)}
          >
            {entry.toPar !== undefined ? formatToPar(entry.toPar) : entry.thru}
          </span>
        ) : null}
      </div>
      <PlaceholderArt
        label={`${player.name} portrait`}
        imageUrl={player.photoUrl}
        tone="slate"
        ratio="1/1"
        className="h-20 w-20 shrink-0 rounded-full sm:h-24 sm:w-24"
      />
    </div>
  );
}

export function MatchupCard({
  group,
  gameNumber,
  favorites = [],
  mainEntries = [],
  tone = "light",
  onSelectPlayer,
}: {
  group: TeeTimeEntry;
  gameNumber: number;
  favorites?: string[];
  mainEntries?: CompetitionEntry[];
  tone?: "light" | "dark";
  onSelectPlayer: (playerId: string) => void;
}) {
  const isDark = tone === "dark";
  const hasFavorite = group.players.some((player) => favorites.includes(player.id));
  const status = groupStatus(group.players, mainEntries);

  return (
    <div className={cn("flex flex-col border", hasFavorite ? "border-accent" : isDark ? "border-surface-dark-foreground/15" : "border-border")}>
      <div
        className={cn(
          "flex items-center justify-between px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide",
          isDark ? "bg-primary text-surface-dark-foreground/60" : "bg-card text-muted-foreground",
        )}
      >
        {status.kind === "finished" ? (
          <span className="inline-flex items-center border border-current px-2 py-0.5 tracking-wider">Finished round</span>
        ) : status.kind === "in-progress" ? (
          <span className="inline-flex items-center gap-1.5 border-t-[3px] border-black/15 bg-white px-2 py-1 text-xs text-primary">
            <Flag className="h-3 w-3" />
            {status.thru}
          </span>
        ) : (
          <span>
            {group.time} · {group.tee} Tee
          </span>
        )}
        <span>Game {gameNumber}</span>
      </div>
      <div
        className={cn(
          "flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-6 sm:divide-x",
          isDark ? "bg-primary sm:divide-surface-dark-foreground/15" : "bg-card sm:divide-border",
        )}
      >
        {group.players.map((player, index) => (
          <div key={player.id} className={cn("flex-1", index > 0 && "sm:pl-6")}>
            <PlayerChip
              player={player}
              isFavorite={favorites.includes(player.id)}
              isDark={isDark}
              entry={mainEntries.find((e) => e.player.id === player.id)}
              onSelectPlayer={onSelectPlayer}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
