import type { Player } from "@/types/player";

export interface ChampionshipWinner {
  year: number;
  venueSlug: string;
  venueName: string;
  winnerName: string;
  winnerCountry: string;
  scoreToPar: number;
  margin: string;
  winnerPlayerSlug?: string;
}

export interface UpcomingChampionship {
  number: number;
  year: number;
  venueSlug: string;
  dates: string;
  ballotCloses: string;
}

export interface Product {
  id: string;
  name: string;
  collection: string;
  price: string;
  category: string;
  imageLabel: string;
}

export interface TeeTimeEntry {
  time: string;
  tee: "1st" | "10th";
  players: Player[];
}

export interface TeeTimeRound {
  round: number;
  day: string;
  date: string;
  groups: TeeTimeEntry[];
}
