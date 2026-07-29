import type { Player } from "@/types/player";

export interface StatRow {
  player: Player;
  value: number;
  display: string;
  position?: number;
  tied?: boolean;
}

export interface StatCategory {
  key: string;
  title: string;
  columnLabel: string;
  rows: StatRow[];
  /** True for to-par-style values (Par Scoring, Strokes Gained) -- colours the tile red/green/blue like the leaderboard's Par column. Plain counts (birdies, pars, bogeys) leave this unset. */
  useParColoring?: boolean;
}
