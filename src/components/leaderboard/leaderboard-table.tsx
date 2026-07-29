"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star } from "lucide-react";

import { cn, splitSurnameFirst } from "@/lib/utils";
import { formatToPar } from "@/lib/leaderboard";
import { CountryFlag } from "@/components/shared/country-flag";
import type { CompetitionEntry, Competition } from "@/lib/data/scorecards";

interface LeaderboardTableProps {
  entries: CompetitionEntry[];
  competition: Competition;
  favorites: string[];
  onToggleFavorite: (playerId: string) => void;
  favoritesOnly: boolean;
  onSelectPlayer: (playerId: string) => void;
}

/** Aggregate (round-total) Par pill — 3-tier, since a multi-hole total doesn't have a meaningful "eagle" case. */
export function scorePillClass(relativeToPar: number): string {
  if (relativeToPar < 0) return "bg-white text-[#CB333B]";
  if (relativeToPar === 0) return "bg-[#0E3D2C] text-white";
  return "bg-white text-[#08325A]";
}

/** Per-hole colours — full eagle/birdie/par/bogey-or-worse scale, only meaningful at the single-hole level. */
export function holeScorePillClass(relativeToPar: number): string {
  if (relativeToPar <= -2) return "bg-[#910149] text-white";
  if (relativeToPar === -1) return "bg-[#CB333B] text-white";
  if (relativeToPar === 0) return "bg-[#758973] text-white";
  return "bg-[#08325A] text-white";
}

const COMPETITION_LABEL: Record<Competition, string> = {
  main: "Nett strokes",
  stableford: "points",
  scratch: "gross strokes",
};

const ROW_TRANSITION = { type: "spring" as const, stiffness: 380, damping: 34, mass: 0.9 };

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
}: {
  entry: CompetitionEntry;
  isFav: boolean;
  onToggleFavorite: (playerId: string) => void;
  competition: Competition;
  onSelectPlayer: (playerId: string) => void;
}) {
  const [isMoving, setIsMoving] = useState(false);
  const { surname, firstName } = splitSurnameFirst(entry.player.name);

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
      <td className="px-2 py-3 tabular-nums">
        <AnimatedValue value={`${entry.tied ? "T" : ""}${entry.position}`} />
      </td>
      <td className="px-2 py-3">
        <button type="button" onClick={() => onSelectPlayer(entry.player.id)} className="hover:underline">
          <span className="font-bold">{surname}</span>
          <span className="font-normal">, {firstName}</span>
        </button>
        <CountryFlag code={entry.player.countryCode} className="ml-2 h-3 w-4 align-middle" />
      </td>
      <td className="px-2 py-3 text-right">
        {entry.toPar !== undefined ? (
          <span className={cn(TILE_CLASS, scorePillClass(entry.toPar))}>
            <AnimatedValue value={formatToPar(entry.toPar)} />
          </span>
        ) : (
          <span className="text-accent-foreground/50">—</span>
        )}
      </td>
      <td className="px-2 py-3 text-right tabular-nums">
        <span className={cn(TILE_CLASS, NEUTRAL_TILE_CLASS)}>
          <AnimatedValue value={entry.thru} />
        </span>
      </td>
      <td className="px-4 py-3 text-right tabular-nums" title={COMPETITION_LABEL[competition]}>
        <span className={cn(TILE_CLASS, NEUTRAL_TILE_CLASS)}>
          <AnimatedValue value={entry.score ?? ""} />
        </span>
      </td>
    </motion.tr>
  );
}

export function LeaderboardTable({ entries, competition, favorites, onToggleFavorite, favoritesOnly, onSelectPlayer }: LeaderboardTableProps) {
  const visible = favoritesOnly ? entries.filter((entry) => favorites.includes(entry.player.id)) : entries;

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
    <div className="overflow-x-auto border border-surface-dark-foreground/15">
      <table className="w-full min-w-[520px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-surface-dark-foreground/15 bg-surface-dark-foreground/5 text-left text-xs uppercase tracking-wide text-surface-dark-foreground/60">
            <th className="w-10 px-4 py-3" aria-label="Favorite" />
            <th className="px-2 py-3">Pos</th>
            <th className="px-2 py-3">Player</th>
            <th className="px-2 py-3 text-right">Par</th>
            <th className="px-2 py-3 text-right">Hole</th>
            <th className="px-4 py-3 text-right">Score</th>
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
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
