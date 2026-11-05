import { describe, expect, it } from "vitest";

import type { ChampionshipTiming } from "@/lib/data/championship-timing";
import {
  LIVE_WINDOW_DAYS,
  activeChampionshipIndex,
  championshipDay,
  hasBeenPlayed,
  inPlayCutoffs,
  isStillToCome,
  isWithinLiveWindow,
  playedCutoffs,
} from "@/lib/data/championship-timing";

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

describe("the live-scoring window", () => {
  // 2027 is the next championship: Castle Stuart, Saturday 11 September. The practice round is
  // always the day before, so the window the society actually wants is the 10th, 11th and 12th.
  const CHAMPIONSHIP = { year: 2027, date: "2027-09-11T12:00:00.000Z" };

  /** What a Payload find() with inPlayWhere() would match, evaluated in JS. */
  function matchesInPlayWhere(doc: ChampionshipTiming, now: Date): boolean {
    const { fromIso, untilIso } = inPlayCutoffs(now);
    if (!doc.date) return false;
    const stored = new Date(doc.date).toISOString();
    return stored >= fromIso && stored < untilIso;
  }

  function at(iso: string): Date {
    return new Date(iso);
  }

  it("is open on the practice day, the championship and the day after, and shut either side", () => {
    const expected: [string, boolean][] = [
      ["2027-09-08T10:00:00.000Z", false],
      ["2027-09-09T10:00:00.000Z", false],
      ["2027-09-10T10:00:00.000Z", true],
      ["2027-09-11T10:00:00.000Z", true],
      ["2027-09-12T10:00:00.000Z", true],
      ["2027-09-13T10:00:00.000Z", false],
      ["2027-09-14T10:00:00.000Z", false],
    ];

    for (const [iso, open] of expected) {
      expect(isWithinLiveWindow(CHAMPIONSHIP, at(iso)), `on ${iso.slice(0, 10)}`).toBe(open);
    }
  });

  it("holds right through the championship day, not just its morning", () => {
    // The stored date is noon. An earlier version of this rule compared raw timestamps, which made
    // the window flip at lunchtime on the one day it had to hold -- the same trap as the venue menu
    // (see getMenuVenueLinks).
    for (const hour of ["00:30", "08:00", "12:00", "16:45", "23:30"]) {
      expect(isWithinLiveWindow(CHAMPIONSHIP, at(`2027-09-11T${hour}:00.000Z`)), `at ${hour}`).toBe(true);
    }
  });

  it("agrees with the where clause on every day around the championship", () => {
    for (let day = 7; day <= 15; day += 1) {
      const now = at(`2027-09-${String(day).padStart(2, "0")}T10:00:00.000Z`);
      expect(matchesInPlayWhere(CHAMPIONSHIP, now), `on 2027-09-${day}`).toBe(isWithinLiveWindow(CHAMPIONSHIP, now));
    }
  });

  it("never opens for an undated championship", () => {
    // An undated record reads as 31 December, and championshipDay would happily put it in the
    // window on 30 December. An unknown date is not a reason to start polling.
    for (const iso of ["2026-12-30T10:00:00.000Z", "2026-12-31T10:00:00.000Z", "2027-01-01T10:00:00.000Z"]) {
      expect(isWithinLiveWindow({ year: 2026 }, at(iso)), `on ${iso.slice(0, 10)}`).toBe(false);
      expect(matchesInPlayWhere({ year: 2026 }, at(iso))).toBe(false);
    }
  });

  it("is shut out of season, which is the whole point", () => {
    expect(isWithinLiveWindow(CHAMPIONSHIP, NOW)).toBe(false);
    for (const doc of ROTA) {
      expect(isWithinLiveWindow(doc, NOW), `year ${doc.year}`).toBe(false);
    }
  });

  it("covers exactly three days and no more", () => {
    const { fromIso, untilIso } = inPlayCutoffs(at("2027-09-11T10:00:00.000Z"));
    const days = (Date.parse(untilIso) - Date.parse(fromIso)) / 86_400_000;
    expect(days).toBe(2 * LIVE_WINDOW_DAYS + 1);
    expect(days).toBe(3);
  });
});
