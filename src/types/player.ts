export interface PlayerGalleryPhoto {
  imageUrl?: string;
  caption?: string;
}

export interface Player {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  age?: number;
  championshipHandicap?: number;
  previousOpens: number;
  turnedPro?: number;
  debutYear?: number;
  photoUrl?: string;
  gallery?: PlayerGalleryPhoto[];
  featuredArticleSlugs?: string[];
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
