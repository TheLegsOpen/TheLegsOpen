"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Star } from "lucide-react";

import { cn, playerSlug, surnameFirst } from "@/lib/utils";
import { formatToPar } from "@/lib/leaderboard";
import { CountryFlag } from "@/components/shared/country-flag";
import type { CompetitionEntry, Competition } from "@/lib/data/scorecards";

interface LeaderboardTableProps {
  entries: CompetitionEntry[];
  competition: Competition;
  favorites: string[];
  onToggleFavorite: (playerId: string) => void;
  favoritesOnly: boolean;
}

function scorePillClass(toPar: number): string {
  if (toPar < 0) return "bg-white text-destructive";
  if (toPar === 0) return "bg-[#66907b] text-white";
  return "bg-white text-blue-600";
}

const COMPETITION_LABEL: Record<Competition, string> = {
  main: "Nett strokes",
  stableford: "points",
  scratch: "gross strokes",
};

const ROW_TRANSITION = { type: "spring" as const, stiffness: 380, damping: 34, mass: 0.9 };

/** Fades/pops a value in whenever it changes, so an updated score or position catches the eye. */
function AnimatedValue({ value }: { value: string | number }) {
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
}: {
  entry: CompetitionEntry;
  isFav: boolean;
  onToggleFavorite: (playerId: string) => void;
  competition: Competition;
}) {
  const [isMoving, setIsMoving] = useState(false);

  return (
    <motion.tr
      layout
      transition={ROW_TRANSITION}
      onLayoutAnimationStart={() => setIsMoving(true)}
      onLayoutAnimationComplete={() => setIsMoving(false)}
      className={cn(
        "relative border-b border-surface-dark-foreground/15 bg-accent/90 text-accent-foreground last:border-0 hover:bg-accent",
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
        <Link href={`/players/${playerSlug(entry.player)}`} className="font-medium hover:underline">
          {surnameFirst(entry.player.name)}
        </Link>
        <CountryFlag code={entry.player.countryCode} className="ml-2 h-3 w-4 align-middle" />
      </td>
      <td className="px-2 py-3 text-right">
        {entry.toPar !== undefined ? (
          <span className={cn("inline-block min-w-[2.75rem] rounded px-2 py-1 text-xs font-bold tabular-nums", scorePillClass(entry.toPar))}>
            <AnimatedValue value={formatToPar(entry.toPar)} />
          </span>
        ) : (
          <span className="text-accent-foreground/50">—</span>
        )}
      </td>
      <td className="px-2 py-3 text-right tabular-nums text-accent-foreground/80">
        <AnimatedValue value={entry.thru} />
      </td>
      <td className="px-4 py-3 text-right font-medium tabular-nums" title={COMPETITION_LABEL[competition]}>
        <AnimatedValue value={entry.score ?? "—"} />
      </td>
    </motion.tr>
  );
}

export function LeaderboardTable({ entries, competition, favorites, onToggleFavorite, favoritesOnly }: LeaderboardTableProps) {
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
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
