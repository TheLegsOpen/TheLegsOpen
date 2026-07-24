import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { slugify } from "@/lib/utils";
import type { UpcomingChampionship } from "@/types/championship";
import type { Article as PayloadArticle, Championship as PayloadChampionship, Venue as PayloadVenue } from "@/payload-types";

/**
 * Data-access seam for the homepage-settings Global — backed by Payload
 * rather than the local CURRENT_CHAMPION / UPCOMING_CHAMPIONSHIPS fixtures.
 */

export interface CurrentChampion {
  winnerName: string;
  venueName: string;
  scoreToPar: number;
  articleSlug: string;
}

export async function getCurrentChampion(): Promise<CurrentChampion> {
  const payload = await getPayload({ config: configPromise });
  const settings = await payload.findGlobal({ slug: "homepage-settings" });

  const championship = settings.currentChampion.championship as PayloadChampionship;
  const article = settings.currentChampion.article as PayloadArticle;
  const venue = championship.venue as PayloadVenue;

  return {
    winnerName: championship.winnerName,
    venueName: venue.name,
    scoreToPar: championship.scoreToPar,
    articleSlug: article.slug ?? slugify(article.title),
  };
}

export async function getUpcomingChampionship(): Promise<UpcomingChampionship> {
  const payload = await getPayload({ config: configPromise });
  const settings = await payload.findGlobal({ slug: "homepage-settings" });

  const venue = settings.nextBallot.venue as PayloadVenue;

  return {
    number: settings.nextBallot.number,
    year: settings.nextBallot.year,
    venueSlug: venue.slug ?? slugify(venue.name),
    dates: settings.nextBallot.dates,
    ballotCloses: settings.nextBallot.ballotCloses,
  };
}
