import { ChevronRight, Star } from "lucide-react";

import { PlaceholderArt } from "@/components/shared/placeholder-art";
import { CountryFlag } from "@/components/shared/country-flag";
import { formatToPar } from "@/lib/leaderboard";
import { formatHandicap } from "@/lib/scoring";
import { cn, portraitUrl, splitSurnameFirst } from "@/lib/utils";
import { scorePillClass, TILE_CLASS } from "@/components/leaderboard/leaderboard-table";
import type { TeeTimeEntry } from "@/types/championship";
import type { CompetitionEntry } from "@/lib/data/scorecards";

function groupFinished(group: TeeTimeEntry, mainEntries: CompetitionEntry[]): boolean {
  const entries = group.players.map((p) => mainEntries.find((e) => e.player.id === p.id)).filter((e) => e?.started);
  return entries.length > 0 && entries.every((e) => e!.thru === "F");
}

/**
 * theopen.com's tee-time group -- each player a tile with first name over SURNAME,
 * the flag, their score once they have teed off, and a large cut-out photo standing in the corner;
 * "Game N" and the tee time down the right-hand side. My players (starred) are ringed in yellow,
 * and the star on each tile adds or removes them.
 */
export function MatchupCard({
  group,
  gameNumber,
  favorites,
  mainEntries,
  roundType = "Championship",
  onSelectPlayer,
  onToggleFavorite,
}: {
  group: TeeTimeEntry;
  gameNumber: number;
  favorites: string[];
  mainEntries: CompetitionEntry[];
  roundType?: "Practice" | "Championship";
  onSelectPlayer: (playerId: string) => void;
  onToggleFavorite: (playerId: string) => void;
}) {
  const finished = groupFinished(group, mainEntries);
  return (
    <div className="flex border-b border-surface-dark-foreground/15 bg-primary">
      <div className="grid flex-1 grid-cols-1 sm:grid-cols-2">
        {group.players.map((player, index) => {
          const { firstName, surname } = splitSurnameFirst(player.name);
          const entry = mainEntries.find((e) => e.player.id === player.id);
          const fav = favorites.includes(player.id);
          // Mirrors the fallback used when scoring a practice card (see Scorecards.ts) so the number
          // shown is always the one their score is actually calculated from.
          const handicap = roundType === "Practice" ? (player.practiceHandicap ?? player.championshipHandicap) : player.championshipHandicap;
          return (
            <div
              key={player.id}
              className={cn(
                "relative flex min-h-[170px] flex-col justify-between overflow-hidden p-4",
                index % 2 === 1 && "sm:border-l sm:border-surface-dark-foreground/15",
                index >= 2 && "border-t border-surface-dark-foreground/15",
                fav && "ring-2 ring-inset ring-accent",
              )}
            >
              {/* Smaller on phones, and the name block keeps clear of it (pr below), so a long
                  surname and its handicap wrap beside the photo instead of running across it. */}
              <div className="absolute bottom-0 right-0 h-[120px] w-[96px] sm:h-[150px] sm:w-[120px]" aria-hidden="true">
                <PlaceholderArt label="" imageUrl={portraitUrl(player.photoUrl)} tone="navy" blendBlack fill fit="contain-bottom" sizes="120px" />
              </div>
              <div className="relative pr-[92px] sm:pr-[112px]">
                <button type="button" onClick={() => onSelectPlayer(player.id)} className="text-left text-surface-dark-foreground hover:text-accent">
                  <span className="block font-menu text-[15px] leading-tight">{firstName}</span>
                  <span className="flex flex-wrap items-center gap-x-1 break-words font-menu text-[20px] font-bold uppercase leading-tight">
                    {surname}
                    {handicap !== undefined ? <span className="text-sm font-normal normal-case">({formatHandicap(handicap)})</span> : null}
                    <ChevronRight className="h-4 w-4 text-accent" aria-hidden="true" />
                  </span>
                </button>
                <CountryFlag code={player.countryCode} className="mt-1 h-3.5 w-5" />
              </div>
              <div className="relative flex items-center gap-3">
                {entry?.started ? (
                  <span className={cn(TILE_CLASS, entry.noReturn || entry.toPar === undefined ? "bg-[#B0B0B0] text-[#08325A]" : scorePillClass(entry.toPar))}>
                    {entry.noReturn || entry.toPar === undefined ? "NR" : formatToPar(entry.toPar)}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => onToggleFavorite(player.id)}
                  aria-pressed={fav}
                  aria-label={`${fav ? "Remove" : "Add"} ${player.name} ${fav ? "from" : "to"} My players`}
                  className="text-surface-dark-foreground/70 hover:text-accent"
                >
                  <Star className={cn("h-4 w-4", fav && "fill-accent text-accent")} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex w-[96px] shrink-0 flex-col justify-between border-l border-surface-dark-foreground/15 p-3 text-right sm:w-[120px] sm:p-4">
        <span className="font-menu text-[14px] font-bold uppercase tracking-[1.6px] text-surface-dark-foreground">Game {gameNumber}</span>
        <span className="flex flex-col gap-1 text-xs uppercase tracking-wide text-surface-dark-foreground/60">
          <span className="font-menu text-[18px] tabular-nums text-surface-dark-foreground">{group.time}</span>
          {group.tee} tee
          {finished ? <span className="mt-1 border border-current px-1.5 py-0.5 text-[10px]">Finished</span> : null}
        </span>
      </div>
    </div>
  );
}
