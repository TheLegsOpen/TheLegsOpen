import { average, type CareerAverage } from "@/lib/career-summary";

/**
 * PGA Tour's Toughest Course: the field's scoring average at each venue, to par, over every
 * completed round played there in every year it hosted. Ranked toughest first on gross, since
 * that is the course's own difficulty; nett takes each player's handicap back off.
 */

interface RoundResult {
  toPar?: number;
  noReturn?: boolean;
  withdrawn?: boolean;
}

export interface CourseDifficulty {
  nett?: CareerAverage;
  gross: CareerAverage;
  /** 1 is the toughest. */
  rank: number;
  tied: boolean;
  /** How many venues are ranked. */
  of: number;
}

export function courseDifficulty(championships: { venueSlug: string; nett: RoundResult[]; gross: RoundResult[] }[]): Map<string, CourseDifficulty> {
  const byVenue = new Map<string, { nett: RoundResult[]; gross: RoundResult[] }>();
  for (const c of championships) {
    const venue = byVenue.get(c.venueSlug) ?? { nett: [], gross: [] };
    venue.nett.push(...c.nett);
    venue.gross.push(...c.gross);
    byVenue.set(c.venueSlug, venue);
  }

  const ranked: { slug: string; nett?: CareerAverage; gross: CareerAverage; shown: number }[] = [];
  for (const [slug, rounds] of byVenue) {
    const gross = average(rounds.gross);
    if (!gross) continue;
    // Ranked on the figure the page shows, so two venues that both read +12.0 are tied.
    ranked.push({ slug, nett: average(rounds.nett), gross, shown: Math.round(gross.average * 10) });
  }
  ranked.sort((a, b) => b.shown - a.shown);

  const result = new Map<string, CourseDifficulty>();
  ranked.forEach((venue, i) => {
    const rank = ranked.findIndex((other) => other.shown === venue.shown) + 1;
    const tied = ranked.some((other, j) => j !== i && other.shown === venue.shown);
    result.set(venue.slug, { ...(venue.nett ? { nett: venue.nett } : {}), gross: venue.gross, rank, tied, of: ranked.length });
  });
  return result;
}
