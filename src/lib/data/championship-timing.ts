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
 * nothing played to show, so showing the nearest one is better than showing nothing.
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

  return docs.length - 1;
}
