import Link from "next/link";
import { Star } from "lucide-react";

import { PlaceholderArt } from "@/components/shared/placeholder-art";
import { CountryFlag } from "@/components/shared/country-flag";
import { formatToPar } from "@/lib/leaderboard";
import { cn, playerSlug, splitSurnameFirst } from "@/lib/utils";
import { scorePillClass, TILE_CLASS, NEUTRAL_TILE_CLASS } from "@/components/leaderboard/leaderboard-table";
import type { TeeTimeEntry } from "@/types/championship";
import type { Player } from "@/types/player";
import type { CompetitionEntry } from "@/lib/data/scorecards";

function PlayerChip({
  player,
  isFavorite,
  isDark,
  entry,
}: {
  player: Player;
  isFavorite: boolean;
  isDark: boolean;
  entry: CompetitionEntry | undefined;
}) {
  const { firstName, surname } = splitSurnameFirst(player.name);

  return (
    <div className="flex flex-1 flex-col items-center gap-2 text-center sm:flex-row sm:text-left">
      <PlaceholderArt
        label={`${player.name} portrait`}
        imageUrl={player.photoUrl}
        tone="slate"
        ratio="1/1"
        className="h-16 w-16 shrink-0 rounded-full"
      />
      <div className="flex flex-1 flex-col items-center gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div>
          <Link
            href={`/players/${playerSlug(player)}`}
            className="flex flex-col items-center leading-tight hover:text-accent sm:items-start"
          >
            <span className="flex items-center gap-1.5 font-display text-sm">
              {isFavorite ? <Star className="h-3 w-3 shrink-0 fill-accent text-accent" aria-hidden="true" /> : null}
              {firstName}
            </span>
            <span className="font-display text-base font-bold uppercase tracking-wide hover:underline">{surname}</span>
          </Link>
          <p
            className={cn(
              "mt-1 flex items-center justify-center gap-1.5 text-xs uppercase tracking-wide sm:justify-start",
              isDark ? "text-surface-dark-foreground/60" : "text-muted-foreground",
            )}
          >
            <CountryFlag code={player.countryCode} className="h-2.5 w-3.5" />
            {player.country}
          </p>
        </div>
        {entry?.started ? (
          <span className={cn(TILE_CLASS, entry.score !== undefined && entry.toPar !== undefined ? scorePillClass(entry.toPar) : NEUTRAL_TILE_CLASS)}>
            {entry.toPar !== undefined ? formatToPar(entry.toPar) : entry.thru}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function MatchupCard({
  group,
  gameNumber,
  favorites = [],
  mainEntries = [],
  tone = "light",
}: {
  group: TeeTimeEntry;
  gameNumber: number;
  favorites?: string[];
  mainEntries?: CompetitionEntry[];
  tone?: "light" | "dark";
}) {
  const isDark = tone === "dark";
  const hasFavorite = group.players.some((player) => favorites.includes(player.id));

  return (
    <div className={cn("flex flex-col border", hasFavorite ? "border-accent" : isDark ? "border-surface-dark-foreground/15" : "border-border")}>
      <div
        className={cn(
          "flex items-center justify-between px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide",
          isDark ? "bg-surface-dark-foreground/5 text-surface-dark-foreground/60" : "bg-muted text-muted-foreground",
        )}
      >
        <span>Game {gameNumber}</span>
        <span>
          {group.time} · {group.tee} Tee
        </span>
      </div>
      <div
        className={cn(
          "flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-6 sm:divide-x",
          isDark ? "sm:divide-surface-dark-foreground/15" : "sm:divide-border",
        )}
      >
        {group.players.map((player, index) => (
          <div key={player.id} className={cn("flex-1", index > 0 && "sm:pl-6")}>
            <PlayerChip
              player={player}
              isFavorite={favorites.includes(player.id)}
              isDark={isDark}
              entry={mainEntries.find((e) => e.player.id === player.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
