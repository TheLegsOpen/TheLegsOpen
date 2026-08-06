import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { slugify, mediaUrl } from "@/lib/utils";
import type { ChampionshipWinner } from "@/types/championship";
import type { Championship as PayloadChampionship, Venue as PayloadVenue, Player as PayloadPlayer } from "@/payload-types";

export interface UpcomingChampionship {
  year: number;
  date?: string;
  venueSlug: string;
  venueName: string;
  venueImageUrl?: string;
  venueImageLabel: string;
  venueCountryCode?: string;
}

/**
 * Data-access seam for championship history — backed by the Championships
 * collection in Payload/Postgres rather than the local fixture. The `venue`
 * and `winnerPlayer` relationships are populated at the default query depth.
 */

function mapChampionship(doc: PayloadChampionship): ChampionshipWinner {
  const venue = doc.venue as PayloadVenue;
  const winnerPlayer = typeof doc.winnerPlayer === "object" && doc.winnerPlayer ? (doc.winnerPlayer as PayloadPlayer) : undefined;

  return {
    id: String(doc.id),
    year: doc.year,
    date: doc.date ?? undefined,
    venueSlug: venue.slug ?? slugify(venue.name),
    venueName: venue.name,
    venueTotalPar: venue.totalPar ?? undefined,
    winnerName: doc.winnerName ?? undefined,
    winnerCountry: doc.winnerCountry ?? undefined,
    winningScore: doc.winningScore ?? undefined,
    scoreToPar: doc.scoreToPar ?? undefined,
    margin: doc.margin ?? undefined,
    winnerPlayerSlug: winnerPlayer?.slug ?? undefined,
    winnerPlayerId: winnerPlayer?.id ? String(winnerPlayer.id) : undefined,
    winnerPlayerDateOfBirth: winnerPlayer?.dateOfBirth ?? undefined,
    winnerPhotoUrl: mediaUrl(doc.winnerPhoto),
    stablefordWinnerName: doc.stablefordWinnerName ?? undefined,
    stablefordWinnerCountry: doc.stablefordWinnerCountry ?? undefined,
    scratchWinnerName: doc.scratchWinnerName ?? undefined,
    scratchWinnerCountry: doc.scratchWinnerCountry ?? undefined,
    runnerUpName: doc.runnerUpName ?? undefined,
    runnerUpScore: doc.runnerUpScore ?? undefined,
    wonOnDebut: doc.wonOnDebut ?? undefined,
    priorAppearances: doc.priorAppearances ?? undefined,
    championAgeAtWin: doc.championAgeAtWin ?? undefined,
    ledOutrightAfter9: doc.ledOutrightAfter9 ?? undefined,
    deficitAfter9: doc.deficitAfter9 ?? undefined,
    largestLeadHolderName: doc.largestLeadHolderName ?? undefined,
    largestLeadMargin: doc.largestLeadMargin ?? undefined,
    largestLeadAfterHole: doc.largestLeadAfterHole ?? undefined,
  };
}

export async function getChampionshipHistory(): Promise<ChampionshipWinner[]> {
  const payload = await getPayload({ config: configPromise });
  const result = await payload.find({ collection: "championships", limit: 100, sort: "-year" });
  return result.docs.map(mapChampionship);
}

export async function getChampionshipByYear(year: number): Promise<ChampionshipWinner | undefined> {
  const payload = await getPayload({ config: configPromise });
  const result = await payload.find({ collection: "championships", where: { year: { equals: year } }, limit: 1 });
  return result.docs[0] ? mapChampionship(result.docs[0]) : undefined;
}

export async function getAllChampionshipYears(): Promise<string[]> {
  const payload = await getPayload({ config: configPromise });
  const result = await payload.find({ collection: "championships", limit: 100 });
  return result.docs.map((doc) => String(doc.year));
}

export async function getChampionshipsByVenueSlug(slug: string): Promise<ChampionshipWinner[]> {
  const history = await getChampionshipHistory();
  return history.filter((c) => c.venueSlug === slug);
}

/** Championships scheduled after today, soonest first — driven by `date` when set, otherwise `year`. */
export async function getUpcomingChampionships(limit = 3): Promise<UpcomingChampionship[]> {
  const payload = await getPayload({ config: configPromise });
  const result = await payload.find({ collection: "championships", limit: 100, sort: "year" });
  const now = new Date();

  const upcoming = result.docs
    .map((doc) => ({
      doc,
      venue: doc.venue as PayloadVenue,
      effectiveDate: doc.date ? new Date(doc.date) : new Date(`${doc.year}-12-31`),
    }))
    .filter(({ doc, effectiveDate }) => (doc.date ? effectiveDate > now : doc.year > now.getFullYear()))
    .sort((a, b) => a.effectiveDate.getTime() - b.effectiveDate.getTime())
    .slice(0, limit);

  return upcoming.map(({ doc, venue }) => ({
    year: doc.year,
    date: doc.date ?? undefined,
    venueSlug: venue.slug ?? slugify(venue.name),
    venueName: venue.name,
    venueImageUrl: mediaUrl(venue.image),
    venueImageLabel: venue.imageLabel,
    venueCountryCode: venue.countryCode ?? undefined,
  }));
}
