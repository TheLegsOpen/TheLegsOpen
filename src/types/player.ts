export interface Player {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  age: number;
  championshipHandicap?: number;
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
