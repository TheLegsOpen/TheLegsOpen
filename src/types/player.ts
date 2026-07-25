export interface Player {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  isAmateur?: boolean;
  age: number;
  /** Omitted for amateurs, who haven't turned professional yet. */
  turnedPro?: number;
  previousOpens: number;
  photoUrl?: string;
  bio: string[];
}

export interface LeaderboardEntry {
  position: number;
  tied: boolean;
  player: Player;
  scoreToPar: number;
  thru: string;
  rounds: number[];
  total: number;
  favoritable: true;
}
