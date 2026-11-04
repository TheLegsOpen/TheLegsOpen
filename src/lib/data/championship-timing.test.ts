import { describe, expect, it } from "vitest";

import type { ChampionshipTiming } from "@/lib/data/championship-timing";
import { activeChampionshipIndex, championshipDay, hasBeenPlayed, isStillToCome, playedCutoffs } from "@/lib/data/championship-timing";

// The real rota as at November 2026: fourteen played, 2027 entered ahead of time, and the flag
// still sitting on the finished 2026 championship so the homepage keeps showing it.
const NOW = new Date("2026-11-04T10:00:00.000Z");

const ROTA = [
  { year: 2013, date: "2013-07-28T12:00:00.000Z" },
  { year: 2014, date: "2014-09-14T12:00:00.000Z" },
  { year: 2025, date: "2025-09-13T12:00:00.000Z" },
  { year: 2026, date: "2026-09-12T12:00:00.000Z", isActive: true },
  { year: 2027, date: "2027-09-11T12:00:00.000Z" },
];

describe("hasBeenPlayed", () => {
  it("counts a championship from two months ago as played", () => {
    expect(hasBeenPlayed({ year: 2026, date: "2026-09-12T12:00:00.000Z" }, NOW)).toBe(true);
  });

  it("does not count one still to come as played", () => {
    expect(hasBeenPlayed({ year: 2027, date: "2027-09-11T12:00:00.000Z" }, NOW)).toBe(false);
  });

  it("does not count today's championship as played, at any hour of the day", () => {
    // Dates are stored at noon. Comparing the stored value against `now` would flip this to
    // "played" at lunchtime and drop the venue out of the menu mid-round.
    const today = { year: 2026, date: "2026-11-04T12:00:00.000Z" };
    expect(hasBeenPlayed(today, new Date("2026-11-04T06:00:00.000Z"))).toBe(false);
    expect(hasBeenPlayed(today, new Date("2026-11-04T13:30:00.000Z"))).toBe(false);
    expect(hasBeenPlayed(today, new Date("2026-11-04T21:00:00.000Z"))).toBe(false);
  });

  it("counts it as played the next day", () => {
    expect(hasBeenPlayed({ year: 2026, date: "2026-11-04T12:00:00.000Z" }, new Date("2026-11-05T06:00:00.000Z"))).toBe(true);
  });

  it("treats an undated championship as the last day of its year", () => {
    expect(championshipDay({ year: 2027 }).getFullYear()).toBe(2027);
    expect(hasBeenPlayed({ year: 2027 }, NOW)).toBe(false);
    expect(hasBeenPlayed({ year: 2025 }, NOW)).toBe(true);
  });
});

describe("isStillToCome", () => {
  it("is the inverse of hasBeenPlayed", () => {
    for (const doc of ROTA) expect(isStillToCome(doc, NOW)).toBe(!hasBeenPlayed(doc, NOW));
  });

  it("keeps a venue listed through its own championship day", () => {
    // What the Venues menu group and the Upcoming Venues bands filter on.
    expect(isStillToCome({ year: 2026, date: "2026-11-04T12:00:00.000Z" }, new Date("2026-11-04T16:00:00.000Z"))).toBe(true);
  });
});

describe("activeChampionshipIndex", () => {
  it("picks the flagged championship", () => {
    expect(activeChampionshipIndex(ROTA, NOW)).toBe(3);
  });

  it("picks the most recently played one when nothing is flagged", () => {
    // The bug this module exists for: with 2027 in the database, unticking the flag on 2026 used
    // to resolve "most recent" as the highest year -- a championship with no scorecards -- so the
    // homepage leaderboard, live blog, weather and sponsor clock all emptied.
    const unflagged = ROTA.map(({ year, date }) => ({ year, date }));
    expect(activeChampionshipIndex(unflagged, NOW)).toBe(3);
    expect(unflagged[activeChampionshipIndex(unflagged, NOW)].year).toBe(2026);
  });

  it("never picks a championship that has not been played", () => {
    const unflagged = ROTA.map(({ year, date }) => ({ year, date }));
    for (const now of [NOW, new Date("2027-01-01T00:00:00.000Z"), new Date("2027-09-10T23:00:00.000Z")]) {
      expect(unflagged[activeChampionshipIndex(unflagged, now)].year).toBe(2026);
    }
  });

  it("moves on to 2027 of its own accord the day after it is played", () => {
    const unflagged = ROTA.map(({ year, date }) => ({ year, date }));
    expect(unflagged[activeChampionshipIndex(unflagged, new Date("2027-09-12T06:00:00.000Z"))].year).toBe(2027);
  });

  it("honours the flag even on a championship not yet played", () => {
    // Championship morning: the flag is ticked before anyone tees off, and the leaderboard has to
    // follow it rather than stay on last year.
    const flaggedUpcoming = [{ year: 2026, date: "2026-09-12T12:00:00.000Z" }, { year: 2027, date: "2027-09-11T12:00:00.000Z", isActive: true }];
    expect(activeChampionshipIndex(flaggedUpcoming, NOW)).toBe(1);
  });

  it("falls back to the nearest championship when none has been played yet", () => {
    // A site whose only records are still to come: showing the next one beats showing nothing.
    // Index 0 of a year-ascending list, matching the `sort: "year", limit: 1` last resort in
    // getActiveChampionship -- the two forms of this rule have to agree.
    const allUpcoming = [{ year: 2027, date: "2027-09-11T12:00:00.000Z" }, { year: 2028, date: "2028-09-09T12:00:00.000Z" }];
    expect(activeChampionshipIndex(allUpcoming, NOW)).toBe(0);
    expect(allUpcoming[activeChampionshipIndex(allUpcoming, NOW)].year).toBe(2027);
  });

  it("returns -1 for an empty list rather than indexing into nothing", () => {
    expect(activeChampionshipIndex([], NOW)).toBe(-1);
  });
});

describe("hasBeenPlayedWhere", () => {
  /**
   * The where clause and hasBeenPlayed are the same rule in two forms -- one for the database, one
   * for a list already in memory. They have to agree, because getActiveChampionship resolves the
   * fallback with the query while getActiveChampionshipSummary and the Players collection resolve
   * it with the predicate. This evaluates the clause in JS against the real rota and checks every
   * record lands on the same side as the predicate.
   */
  function matchesWhere(doc: ChampionshipTiming, now: Date): boolean {
    const { beforeIso, beforeYear } = playedCutoffs(now);
    if (doc.date) return new Date(doc.date).toISOString() < beforeIso;
    return doc.year < beforeYear;
  }

  const DATED_AND_UNDATED: ChampionshipTiming[] = [
    ...ROTA.map(({ year, date }) => ({ year, date })),
    { year: 2024 },
    { year: 2026 },
    { year: 2028 },
  ];

  it("agrees with hasBeenPlayed on every record, dated or not", () => {
    for (const doc of DATED_AND_UNDATED) {
      expect(matchesWhere(doc, NOW), `year ${doc.year} date ${doc.date ?? "(none)"}`).toBe(hasBeenPlayed(doc, NOW));
    }
  });

  it("agrees on championship day itself, when the two could most easily diverge", () => {
    const day = new Date("2027-09-11T15:00:00.000Z");
    const today = { year: 2027, date: "2027-09-11T12:00:00.000Z" };
    expect(matchesWhere(today, day)).toBe(false);
    expect(hasBeenPlayed(today, day)).toBe(false);
  });

  it("excludes an undated championship in the current year, matching championshipDay's 31 December", () => {
    // championshipDay reads an undated 2026 record as 31 Dec 2026, which is still to come today.
    expect(hasBeenPlayed({ year: 2026 }, NOW)).toBe(false);
    expect(matchesWhere({ year: 2026 }, NOW)).toBe(false);
  });
});
