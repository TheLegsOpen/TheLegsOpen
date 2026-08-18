"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Star } from "lucide-react";

import { cn, splitSurnameFirst } from "@/lib/utils";
import { formatToPar, isConcluded } from "@/lib/leaderboard";
import { CountryFlag } from "@/components/shared/country-flag";
import type { CompetitionEntry, Competition } from "@/lib/data/scorecards";
import type { RankedEntry } from "@/lib/data/playoffs";

interface LeaderboardTableProps {
  entries: RankedEntry[];
  competition: Competition;
  favorites: string[];
  onToggleFavorite: (playerId: string) => void;
  favoritesOnly: boolean;
  onSelectPlayer: (playerId: string) => void;
  /** The Main champion's player id, when this is the Stableford table -- the club's rule is the
   * Main champion never also takes the Stableford title, so the "Golfer of the Year" honour (and
   * its bold styling) goes to the next-best eligible player instead. Their raw position number is
   * untouched (they genuinely do have the most points) -- only the title recognition moves. */
  excludeFromTitle?: string;
}

/** Aggregate (round-total) Par pill — 3-tier, since a multi-hole total doesn't have a meaningful "eagle" case. */
export function scorePillClass(relativeToPar: number): string {
  if (relativeToPar < 0) return "bg-white text-[#CB333B]";
  if (relativeToPar === 0) return "bg-[#0E3D2C] text-white";
  return "bg-white text-[#08325A]";
}

/** Per-hole colours — full eagle/birdie/par/bogey/double-bogey-or-worse scale, only meaningful at the single-hole level. Par is a neutral grey here (rather than the round-total pill's dark green) since with 18 small cells in a row, dark green and dark navy (bogey) read as nearly the same colour -- grey stays clearly distinct from every other tier. Double bogey or worse gets its own lighter blue (rather than reusing bogey's navy) so a genuinely bad hole reads as visually distinct from an ordinary one-shot bogey. */
export function holeScorePillClass(relativeToPar: number): string {
  if (relativeToPar <= -2) return "bg-[#910149] text-white";
  if (relativeToPar === -1) return "bg-[#CB333B] text-white";
  if (relativeToPar === 0) return "bg-[#B0B0B0] text-black";
  if (relativeToPar === 1) return "bg-[#08325A] text-white";
  return "bg-[#4D91C6] text-white";
}

const COMPETITION_LABEL: Record<Competition, string> = {
  main: "Nett strokes",
  stableford: "points",
  scratch: "gross strokes",
};

const CHAMPION_LABEL: Record<Competition, string> = {
  main: "Champion Golfer Of The Year",
  scratch: "Scratch Golfer Of The Year",
  stableford: "Stableford Golfer Of The Year",
};

const ROW_TRANSITION = { type: "spring" as const, stiffness: 380, damping: 34, mass: 0.9 };

/** Shrinks the Par/Hole/Score pills below `sm` so all three fit alongside a readable player name
 * without forcing horizontal scroll -- TILE_CLASS itself stays untouched since it's shared with
 * hole-by-hole-table/leaderboard-widget/player-popup, which don't need this override. */
const RESPONSIVE_TILE = "min-w-9 px-1 sm:min-w-[2.75rem] sm:px-2";

/** Flat, square-cornered, shadow-free tiles for Par/Hole/Score — matches theopen.com's leaderboard cell styling exactly (no radius, no shadow). Top edge replicates their .score-cell--has-border:before: a 3px solid-black line at 15% opacity, not a bordered colour. */
export const TILE_CLASS = "inline-block min-w-[2.75rem] px-2 py-1 text-xs font-bold tabular-nums border-t-[3px] border-black/15";
export const NEUTRAL_TILE_CLASS = "bg-[#FFD062] text-black";

/** Fades/pops a value in whenever it changes, so an updated score or position catches the eye. */
export function AnimatedValue({ value }: { value: string | number }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={value}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 6 }}
        transition={{ duration: 0.22 }}
        className="inline-block"
      >
        {value}
      </motion.span>
    </AnimatePresence>
  );
}

function LeaderboardRow({
  entry,
  isFav,
  onToggleFavorite,
  competition,
  onSelectPlayer,
  concluded,
  isTitleHolder,
  isExcludedChampion,
}: {
  entry: RankedEntry;
  isFav: boolean;
  onToggleFavorite: (playerId: string) => void;
  competition: Competition;
  onSelectPlayer: (playerId: string) => void;
  concluded: boolean;
  isTitleHolder: boolean;
  /** True for the Main champion's own row when they also lead this competition outright (no tie
   * involved -- a genuine tie instead gets `entry.playoffNote` from the site's real countback
   * logic). Explains why the top score here doesn't carry the "Golfer of the Year" honour. */
  isExcludedChampion: boolean;
}) {
  const [isMoving, setIsMoving] = useState(false);
  const { surname, firstName } = splitSurnameFirst(entry.player.name);
  const isLeader = concluded && isTitleHolder && !entry.tied;

  return (
    <motion.tr
      layout
      transition={ROW_TRANSITION}
      onLayoutAnimationStart={() => setIsMoving(true)}
      onLayoutAnimationComplete={() => setIsMoving(false)}
      className={cn(
        "relative bg-accent/90 text-accent-foreground hover:bg-accent",
        isMoving && "z-10 shadow-[0_10px_24px_-6px_rgba(0,0,0,0.45)]",
      )}
      style={{ position: "relative" }}
    >
      <td className="px-1 py-3 sm:px-4">
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
      <td className="px-2 py-3 tabular-nums">
        <span className={cn(isLeader && "text-lg font-black text-primary")}>
          <AnimatedValue value={entry.noReturn ? "NR" : `${entry.tied ? "T" : ""}${entry.position}`} />
        </span>
      </td>
      <td className="px-2 py-3">
        {isLeader ? (
          <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
            {CHAMPION_LABEL[competition]}
          </span>
        ) : null}
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onSelectPlayer(entry.player.id)} className="truncate hover:underline">
            <span className={cn("font-bold", isLeader && "text-base")}>{surname}</span>
            <span className="font-normal">, {firstName}</span>
          </button>
          <CountryFlag code={entry.player.countryCode} className="h-3 w-4 shrink-0 align-middle" />
        </div>
        {entry.playoffNote ? (
          <p className={cn("mt-0.5 text-[10px] font-bold uppercase tracking-wide", entry.playoffNote.won ? "text-primary" : "text-primary/60")}>
            {entry.playoffNote.display ? `${entry.playoffNote.label} (${entry.playoffNote.display})` : entry.playoffNote.label}
          </p>
        ) : isExcludedChampion ? (
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-primary/60">Ineligible (Already Main Champion)</p>
        ) : null}
        {entry.playoffNote && entry.playoffNote.holeIndices.length > 0 ? (
          <div className="mt-1.5 flex gap-1">
            {entry.playoffNote.holeIndices.map((i) => {
              const hole = entry.holes[i];
              if (!hole) return null;
              return (
                <div key={i} className="flex flex-col items-center gap-0.5">
                  <span className="text-center text-[9px] font-semibold leading-tight text-accent-foreground/50">
                    {hole.holeNumber}
                    <br />
                    {hole.par}
                  </span>
                  <span className={cn(TILE_CLASS, "min-w-0 w-8 px-0", hole.value !== undefined ? holeScorePillClass(hole.relative) : NEUTRAL_TILE_CLASS)}>
                    {hole.value ?? "—"}
                  </span>
                </div>
              );
            })}
          </div>
        ) : null}
      </td>
      <td className="hidden whitespace-nowrap px-2 py-3 text-right text-xs tabular-nums text-accent-foreground/70 sm:table-cell">
        {!entry.started && entry.teeTime ? (
          <span className="inline-flex items-center justify-end gap-1.5 leading-none">
            <Clock className="h-3 w-3 shrink-0" />
            {entry.teeTime}
          </span>
        ) : null}
      </td>
      <td className="px-1 py-3 text-right sm:px-2">
        {entry.noReturn ? (
          <span className={cn(TILE_CLASS, RESPONSIVE_TILE, "bg-white text-[#CB333B]")} title="No return — picked up on a hole, disqualified from this competition">
            NR
          </span>
        ) : entry.toPar !== undefined ? (
          <span className={cn(TILE_CLASS, RESPONSIVE_TILE, scorePillClass(entry.toPar))}>
            <AnimatedValue value={formatToPar(entry.toPar)} />
          </span>
        ) : (
          <span className="text-accent-foreground/50">—</span>
        )}
      </td>
      <td className="px-1 py-3 text-right tabular-nums sm:px-2">
        <span className={cn(TILE_CLASS, RESPONSIVE_TILE, NEUTRAL_TILE_CLASS)}>
          <AnimatedValue value={entry.thru} />
        </span>
      </td>
      <td className="px-1 py-3 text-right tabular-nums sm:px-4" title={COMPETITION_LABEL[competition]}>
        <span className={cn(TILE_CLASS, RESPONSIVE_TILE, NEUTRAL_TILE_CLASS)}>
          <AnimatedValue value={entry.noReturn ? "NR" : entry.started && entry.score !== undefined ? entry.score : "-"} />
        </span>
      </td>
    </motion.tr>
  );
}

export function LeaderboardTable({ entries, competition, favorites, onToggleFavorite, favoritesOnly, onSelectPlayer, excludeFromTitle }: LeaderboardTableProps) {
  const visible = favoritesOnly ? entries.filter((entry) => favorites.includes(entry.player.id)) : entries;
  const concluded = isConcluded(entries);
  // entries is already position-sorted, so the first entry that isn't the excluded Main champion
  // is the real title-holder -- falls back to entries[0] itself when there's no exclusion active.
  const titleHolderId = (excludeFromTitle ? entries.find((e) => e.player.id !== excludeFromTitle) : entries[0])?.player.id;

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-surface-dark-foreground/20 py-16 text-center">
        <p className="font-display font-bold text-lg">Field not yet set</p>
        <p className="text-sm text-surface-dark-foreground/60">The field will appear here once tee times are generated for this championship.</p>
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-surface-dark-foreground/20 py-16 text-center">
        <p className="font-display font-bold text-lg">No favorites on the leaderboard</p>
        <p className="text-sm text-surface-dark-foreground/60">Star a player to track them here.</p>
      </div>
    );
  }

  return (
    <div className="no-scrollbar overflow-x-auto border border-surface-dark-foreground/15 bg-primary">
      <table className="w-full min-w-0 table-fixed border-collapse text-sm sm:min-w-[640px]">
        <colgroup>
          <col className="w-8 sm:w-10" />
          <col className="w-10 sm:w-12" />
          <col />
          <col className="hidden sm:table-column sm:w-20" />
          <col className="w-12 sm:w-16" />
          <col className="w-12 sm:w-16" />
          <col className="w-14 sm:w-20" />
        </colgroup>
        <thead>
          <tr className="border-b border-surface-dark-foreground/15 bg-surface-dark-foreground/5 text-left text-xs uppercase tracking-wide text-surface-dark-foreground/60">
            <th className="w-8 px-1 py-3 sm:w-10 sm:px-4" aria-label="Favorite" />
            <th className="px-2 py-3">Pos</th>
            <th className="px-2 py-3">Player</th>
            <th className="hidden px-2 py-3 text-right sm:table-cell" aria-label="Tee time" />
            <th className="px-1 py-3 text-right sm:px-2">Par</th>
            <th className="px-1 py-3 text-right sm:px-2">Hole</th>
            <th className="px-1 py-3 text-right sm:px-4">Score</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((entry) => (
            <LeaderboardRow
              key={entry.player.id}
              entry={entry}
              isFav={favorites.includes(entry.player.id)}
              onToggleFavorite={onToggleFavorite}
              competition={competition}
              onSelectPlayer={onSelectPlayer}
              concluded={concluded}
              isTitleHolder={entry.player.id === titleHolderId}
              isExcludedChampion={Boolean(excludeFromTitle) && entry.player.id === excludeFromTitle && entry.player.id !== titleHolderId}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
