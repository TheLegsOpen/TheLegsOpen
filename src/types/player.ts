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
  /** Raw Lexical document -- render with RichTextBlock (src/components/shared/rich-text.tsx). */
  bio: unknown;
}

export interface PlayerWithChampionshipAge extends Player {
  /** Age as of the active championship's date, not today — undefined if date of birth is unknown or age is hidden. */
  ageAtChampionship?: number;
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
