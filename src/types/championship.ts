import type { Player } from "@/types/player";

export interface ChampionshipWinner {
  id: string;
  year: number;
  date?: string;
  isActive?: boolean;
  completed?: boolean;
  venueSlug: string;
  venueName: string;
  venueTotalPar?: number;
  winnerName?: string;
  winnerCountry?: string;
  winningScore?: number;
  scoreToPar?: number;
  margin?: string;
  winnerPlayerSlug?: string;
  winnerPlayerId?: string;
  winnerPlayerDateOfBirth?: string;
  winnerPhotoUrl?: string;
  stablefordWinnerName?: string;
  stablefordWinnerCountry?: string;
  scratchWinnerName?: string;
  scratchWinnerCountry?: string;
  runnerUpName?: string;
  runnerUpScore?: number;
  wonOnDebut?: boolean;
  priorAppearances?: number;
  championAgeAtWin?: number;
  ledOutrightAfter9?: boolean;
  deficitAfter9?: number;
  largestLeadHolderName?: string;
  largestLeadMargin?: number;
  largestLeadAfterHole?: number;
}

export interface TeeTimeEntry {
  time: string;
  tee: "1st" | "10th";
  players: Player[];
}

export interface TeeTimeRound {
  round: "Practice" | "Championship";
  /** Formatted for display, e.g. "Sunday 19th July 2026". */
  date: string;
  groups: TeeTimeEntry[];
}
