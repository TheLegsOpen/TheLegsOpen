/**
 * When a championship counts as played, and which one the site should be showing.
 *
 * Deliberately free of any Payload import so the three places that need this rule can share it:
 * lib/data/scorecards.ts, lib/data/championships.ts and collections/Players.ts each had their own
 * copy, and all three got the same case wrong.
 *
 * The case: "whichever championship is flagged Currently Being Scored, else the most recent" used
 * to resolve the fallback as the highest `year`. That was right while the newest record was always
 * the last one played -- and wrong the moment a championship was entered ahead of time. With 2027
 * in the database, unticking the flag on the finished 2026 championship pointed the homepage
 * leaderboard, live blog, weather and sponsor clock at an event with no scorecards, so they all
 * emptied. "Most recent" has to mean most recently *played*.
 */

import type { Where } from "payload";

export interface ChampionshipTiming {
  year: number;
  date?: string | null;
}

/** Midnight at the start of today, so a comparison is between whole days rather than timestamps. */
export function startOfToday(now: Date = new Date()): Date {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start;
}

/**
 * The two cutoffs the "already played" rule compares against: a timestamp for a championship with
 * a date, and a year for one without. Exported so the query form below and hasBeenPlayed can be
 * checked against each other on the same numbers rather than on the shape of a where clause.
 */
export function playedCutoffs(now: Date = new Date()): { beforeIso: string; beforeYear: number } {
  return { beforeIso: startOfToday(now).toISOString(), beforeYear: now.getFullYear() };
}

/**
 * The same "already played" rule as a Payload `where` clause, so the most recently played
 * championship can be fetched with one limit-1 query instead of loading the collection and
 * filtering in JS. Both branches are needed: a championship with no date set is judged on its
 * year, exactly as championshipDay does.
 *
 * `Where` is a type-only import, so this module still pulls nothing from Payload at runtime and
 * stays safe for the collection config to import.
 */
export function hasBeenPlayedWhere(now: Date = new Date()): Where {
  const { beforeIso, beforeYear } = playedCutoffs(now);
  return {
    or: [{ date: { less_than: beforeIso } }, { and: [{ date: { exists: false } }, { year: { less_than: beforeYear } }] }],
  };
}

/**
 * The day a championship is played on. Championship dates are stored at noon, so comparing the
 * stored value against `now` would call a round finished halfway through its own morning -- hence
 * every comparison here is made at day granularity.
 *
 * With no date set, the last day of its year: an undated 2027 record is still to come throughout
 * 2027, which is the same reading getUpcomingChampionships has always taken.
 */
export function championshipDay(doc: ChampionshipTiming): Date {
  const day = doc.date ? new Date(doc.date) : new Date(`${doc.year}-12-31T12:00:00.000Z`);
  day.setHours(0, 0, 0, 0);
  return day;
}

/** Played and done: its day is out. Today's championship is not yet played -- it is being played. */
export function hasBeenPlayed(doc: ChampionshipTiming, now: Date = new Date()): boolean {
  return championshipDay(doc).getTime() < startOfToday(now).getTime();
}

/**
 * Still to come, or on today. The inverse of hasBeenPlayed, and what "upcoming" means for the
 * Venues menu group and the Upcoming Venues bands: a venue should not drop off either of them
 * partway through its own championship, which is exactly when people are looking for it.
 */
export function isStillToCome(doc: ChampionshipTiming, now: Date = new Date()): boolean {
  return !hasBeenPlayed(doc, now);
}

/**
 * The index of the championship the site should be showing, from a list sorted by year ascending:
 * whichever is flagged active, else the most recently played, else the last in the list.
 *
 * The final fallback matters on a site whose only championships are still to come -- there is
 * nothing played to show, so the nearest one is better than nothing. Index 0 because the list is
 * sorted by year ascending, which keeps this in step with the limit-1 query form of the same rule
 * in getActiveChampionship.
 */
export function activeChampionshipIndex<T extends ChampionshipTiming & { isActive?: boolean | null }>(
  docs: T[],
  now: Date = new Date(),
): number {
  if (docs.length === 0) return -1;

  const flagged = docs.findIndex((doc) => doc.isActive);
  if (flagged !== -1) return flagged;

  for (let index = docs.length - 1; index >= 0; index -= 1) {
    if (hasBeenPlayed(docs[index], now)) return index;
  }

  return 0;
}

/**
 * How many days either side of a championship's own day count as "in play", for the pages that
 * poll the server for live scoring changes.
 *
 * 1, so the window is three days: the practice round, which is always played the day before; the
 * championship itself; and the day after, for late scorecard corrections. Checked against 2027 --
 * an 11 September championship is in play on the 10th, 11th and 12th, and on no other day.
 */
export const LIVE_WINDOW_DAYS = 1;

/**
 * The half-open window [from, until) that `LIVE_WINDOW_DAYS` describes, as ISO strings.
 *
 * Built with setDate rather than by adding 24h in milliseconds: both ends are local midnights, and
 * a pair of local midnights either side of a BST change is 23 or 25 hours apart, so millisecond
 * arithmetic drifts a day at exactly the end of March and October. setDate moves whole calendar
 * days, which is what the window is actually counted in.
 *
 * Exported so the test can assert the dates themselves rather than the shape of a Payload clause.
 */
export function inPlayCutoffs(now: Date = new Date()): { fromIso: string; untilIso: string } {
  const from = startOfToday(now);
  from.setDate(from.getDate() - LIVE_WINDOW_DAYS);

  const until = startOfToday(now);
  until.setDate(until.getDate() + LIVE_WINDOW_DAYS + 1);

  return { fromIso: from.toISOString(), untilIso: until.toISOString() };
}

/**
 * Championships being played right now, give or take `LIVE_WINDOW_DAYS`.
 *
 * Asked of the whole collection rather than of whichever championship is "active", on purpose.
 * getActiveChampionship answers a different question -- which championship's data should the site
 * be showing -- and between events it deliberately answers with the last one *played*. Hanging the
 * polling gate off that would mean a championship stopped auto-refreshing on its own morning
 * whenever the "Currently Being Scored" tick happened to be off, which is a bad failure on the one
 * day of the year it matters. A date comparison over the collection cannot get that wrong.
 *
 * A championship with no date set is excluded, which a clause on `date` does for free: an unknown
 * date is not a reason to start polling every ten seconds.
 */
export function inPlayWhere(now: Date = new Date()): Where {
  const { fromIso, untilIso } = inPlayCutoffs(now);
  return { and: [{ date: { greater_than_equal: fromIso } }, { date: { less_than: untilIso } }] };
}

/**
 * The same window as `inPlayWhere`, asked of a single document already in hand.
 *
 * Agrees with the clause by construction: championshipDay normalises to local midnight and the
 * cutoffs are local midnights, while the stored dates the clause compares sit at noon -- 11 hours
 * clear of either boundary, so both forms put every championship on the same side of it.
 */
export function isWithinLiveWindow(doc: ChampionshipTiming, now: Date = new Date()): boolean {
  if (!doc.date) return false;
  const { fromIso, untilIso } = inPlayCutoffs(now);
  const day = championshipDay(doc).getTime();
  return day >= Date.parse(fromIso) && day < Date.parse(untilIso);
}
