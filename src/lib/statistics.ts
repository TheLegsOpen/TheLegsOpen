import type { Player } from "@/types/player";

export interface StatRow {
  player: Player;
  value: number;
  display: string;
  position?: number;
  tied?: boolean;
  /** Listed below the ranked players without a place, short of the table's minimum (Bounce Back's chances). */
  unranked?: boolean;
}

export interface StatCategory {
  key: string;
  title: string;
  columnLabel: string;
  rows: StatRow[];
  /** True for to-par-style values (Par Scoring, Strokes Gained) -- colours the tile red/green/blue like the leaderboard's Par column. Plain counts (birdies, pars, bogeys) leave this unset. */
  useParColoring?: boolean;
  /** What an empty table says. Defaults to "Nothing recorded yet.", which is wrong for a finished year that simply had no eagles. */
  emptyMessage?: string;
  /** A line under the full rankings, e.g. the minimum a player needs to be ranked. */
  note?: string;
}

/**
 * The scoring stats a tab previews, in this order. The Nett and Scratch tabs had grown to 19 cards
 * each; these eight are the headline figures, and every stat, these included, is still in the
 * full-rankings explorer.
 */
const PREVIEW_SCORING_KEYS = [
  "strokes-gained",
  "best-front-9",
  "best-back-9",
  "most-birdies-or-better",
  "birdie-or-better-percentage",
  "bogey-avoidance",
  "bounce-back",
  "most-eagles-or-better",
];

export function previewCategories(categories: StatCategory[], mode: "nett" | "scratch"): StatCategory[] {
  return PREVIEW_SCORING_KEYS.flatMap((key) => categories.filter((c) => c.key === `${key}-${mode}`)).filter(
    // A gross eagle is rare enough that most years' scratch card would read "No eagles.", so it
    // only previews in a year that had one. The table lists only players who made an eagle, so
    // empty means none. Still in the explorer either way.
    (c) => !(c.key === "most-eagles-or-better-scratch" && c.rows.length === 0),
  );
}
