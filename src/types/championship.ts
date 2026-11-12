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
  /** Editorial override for the Overview tab. Empty means the story is generated from the fields around it. */
  overviewStory?: unknown;
  /** Optional YouTube or Vimeo link shown in the Overview tab. */
  overviewVideoUrl?: string;
  /** Optional video file hosted on the site; plays in place of overviewVideoUrl when set. */
  overviewVideoFileUrl?: string;
  /** Editorial caption written across this championship's photo in the venue page strip. Empty means the photo carries its year alone. */
  venueStripCaption?: string;
  /** Strip-only photo override. Empty means the strip shows whatever Champion Golfers shows. */
  venueStripPhotoUrl?: string;
  /** The "Best of the [year]" photo band on Previous Opens. Empty hides the band. */
  gallery?: { imageUrl?: string; caption?: string }[];
  winnerPlayerSlug?: string;
  winnerPlayerId?: string;
  winnerPlayerDateOfBirth?: string;
  winnerPhotoUrl?: string;
  /** True when the Champion Photo is wide enough to fill a page banner (landscape, at least 1200px wide). */
  winnerPhotoLandscape?: boolean;
  /** The Champion Photo's focal point from the admin as a CSS object-position ("49% 18%"); unset when left at the centre. */
  winnerPhotoPosition?: string;
  /** The background-removed champion shown in the Main leaderboard's winner row. */
  championCutoutUrl?: string;
  /** The venue's own course photo, for banners when the Champion Photo will not fill one. */
  venueImageUrl?: string;
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
  /** The stored date, for working out whether the round is today. */
  isoDate?: string;
  groups: TeeTimeEntry[];
}
