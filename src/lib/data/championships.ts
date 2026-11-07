import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { slugify, mediaUrl, ordinal } from "@/lib/utils";
import { activeChampionshipIndex, inPlayWhere, isStillToCome } from "@/lib/data/championship-timing";
import type { ChampionshipWinner } from "@/types/championship";
import type { Championship as PayloadChampionship, Venue as PayloadVenue, Player as PayloadPlayer } from "@/payload-types";

export interface ActiveChampionshipSummary {
  year: number;
  /** This championship's real ordinal position -- counted from every recorded Championship, not a hand-maintained number. */
  ordinal: number;
  venueName: string;
  venueSlug: string;
  /** The championship's date, or 31 Dec of its year when no date is set -- used for "age at this championship" calculations. */
  effectiveDate: string;
}

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
    isActive: doc.isActive ?? undefined,
    completed: doc.completed ?? undefined,
    venueSlug: venue.slug ?? slugify(venue.name),
    venueName: venue.name,
    venueTotalPar: venue.totalPar ?? undefined,
    winnerName: doc.winnerName ?? undefined,
    winnerCountry: doc.winnerCountry ?? undefined,
    winningScore: doc.winningScore ?? undefined,
    scoreToPar: doc.scoreToPar ?? undefined,
    margin: doc.margin ?? undefined,
    overviewStory: doc.overviewStory ?? undefined,
    overviewVideoUrl: doc.overviewVideoUrl ?? undefined,
    venueStripCaption: doc.venueStripCaption ?? undefined,
    venueStripPhotoUrl: mediaUrl(doc.venueStripPhoto),
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

/** Championships not yet played, soonest first — today's counts, so a venue does not drop off the band partway through its own championship. */
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
    .filter(({ doc }) => isStillToCome(doc, now))
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

/**
 * Whichever championship is flagged "Currently Being Scored" — falls back to the most recently
 * played one, the shared rule in lib/data/championship-timing.ts. The live-scoring lookup in
 * lib/data/scorecards.ts resolves the same way; both go through that module rather than importing
 * each other, which is what kept the two copies of the rule from being noticed as they drifted.
 */
export async function getActiveChampionshipSummary(): Promise<ActiveChampionshipSummary | undefined> {
  const payload = await getPayload({ config: configPromise });
  const allChampionships = await payload.find({ collection: "championships", limit: 500, depth: 0, sort: "year" });
  if (allChampionships.docs.length === 0) return undefined;

  const index = activeChampionshipIndex(allChampionships.docs);
  const doc = allChampionships.docs[index];

  const venueResult = await payload.find({
    collection: "venues",
    where: { id: { equals: typeof doc.venue === "object" ? doc.venue.id : doc.venue } },
    limit: 1,
  });
  const venue = venueResult.docs[0];
  if (!venue) return undefined;

  return {
    year: doc.year,
    ordinal: index + 1,
    venueName: venue.name,
    venueSlug: venue.slug ?? slugify(venue.name),
    effectiveDate: doc.date ?? `${doc.year}-12-31`,
  };
}

/**
 * Venues for the slide-in menu's "Venues" group -- championships still to be played, today's
 * included.
 *
 * This used to force-include whichever championship was flagged "Currently Being Scored", because
 * comparing the stored date against `now` dropped a venue out of the menu partway through its own
 * tournament -- championship dates are stored at noon, so a round vanished from the menu at
 * lunchtime, exactly when people were looking for it. isStillToCome compares whole days instead,
 * which keeps the venue listed all through its own championship without the flag.
 *
 * Losing the force-include is the point: the flag is normally left on the last championship between
 * events so the homepage leaderboard and live blog keep showing it, and that was putting a course
 * played two months ago in a list of courses still to come.
 *
 * Returns [] on any failure -- this renders in the root layout, so a database blip should cost the
 * menu one group, not every page on the site.
 */
export async function getMenuVenueLinks(): Promise<{ label: string; href: string }[]> {
  try {
    const payload = await getPayload({ config: configPromise });
    const result = await payload.find({ collection: "championships", limit: 100, sort: "year", depth: 1 });
    const now = new Date();

    const rows = result.docs
      .map((doc, index) => {
        const venue = (typeof doc.venue === "object" ? doc.venue : undefined) as PayloadVenue | undefined;
        if (!venue?.name) return undefined;
        // Position in the year-sorted list, which is this championship's real ordinal -- the same
        // count getActiveChampionshipSummary uses, rather than a number kept by hand anywhere.
        return { doc, venue, ordinal: index + 1, effectiveDate: doc.date ? new Date(doc.date) : new Date(`${doc.year}-12-31`) };
      })
      .filter((row): row is NonNullable<typeof row> => row !== undefined)
      .filter(({ doc }) => isStillToCome(doc, now))
      .sort((a, b) => a.effectiveDate.getTime() - b.effectiveDate.getTime());

    // A venue can host more than once; show it at its earliest upcoming appearance only.
    const seen = new Set<string>();
    return rows.flatMap(({ venue, ordinal: position }) => {
      const slug = venue.slug ?? slugify(venue.name);
      if (seen.has(slug)) return [];
      seen.add(slug);
      // "15th St Andrews - Craigtoun", the way The Open lists "155th St Andrews" in its menu --
      // the championship, not just the course it is played on.
      return [{ label: `${ordinal(position)} ${venue.name}`, href: `/venues/${slug}` }];
    });
  } catch {
    return [];
  }
}

/**
 * Whether a championship is close enough to being played that the homepage and the public
 * leaderboard should poll the server for changes.
 *
 * Those two pages auto-refreshed every 10 seconds unconditionally, all year round. Both are
 * force-dynamic, so a poll is a full server render against Supabase rather than a cached hit --
 * roughly 0.9s and the better part of twenty queries, 360 times an hour, per open tab, returning
 * identical data for the eleven and a half months a year when nobody is playing golf. It is also
 * the multiplier that turned a query of mine nine times too expensive into an outage: an expensive
 * render only takes a site down when something calls it unprompted.
 *
 * Worth knowing why the old comment on page.tsx did not catch it. It argued the poll was cheap
 * because it "mostly hits Vercel's CDN cache rather than the database", which was true while the
 * page was `revalidate = 60`. Moving to force-dynamic to get builds working removed the cache
 * window and left the sentence explaining why the poll was harmless in place.
 *
 * One limit-1 query at depth 0 per render, which is the cost of not doing 359 of them.
 *
 * Returns false on any failure -- see the fallback on getSiteTheme (src/lib/data/site-theme.ts).
 * Not polling is the safe way to fail: the page still renders live data on every real visit.
 */
export async function isChampionshipInPlay(): Promise<boolean> {
  try {
    const payload = await getPayload({ config: configPromise });
    const result = await payload.find({
      collection: "championships",
      where: inPlayWhere(),
      depth: 0,
      // pagination: false rather than limit: 1 -- it skips the count(*) that a paginated find also
      // runs, and the two are mutually exclusive in Payload (pagination: false ignores limit, so
      // writing both would just read as though the limit were doing something). A three-day window
      // holds at most one championship, they being a year apart, and anything more than one still
      // answers this question the same way.
      pagination: false,
    });
    return result.docs.length > 0;
  } catch {
    return false;
  }
}
