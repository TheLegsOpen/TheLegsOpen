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
}
