import { describe, expect, it } from "vitest";

import { courseDifficulty } from "@/lib/course-difficulty";

const card = (toPar: number, extra: { noReturn?: boolean; withdrawn?: boolean } = {}) => ({ toPar, ...extra });

describe("courseDifficulty", () => {
  it("averages every completed round at each venue, across the years it hosted, and ranks the toughest first on gross", () => {
    const championships = [
      { venueSlug: "carnwath", nett: [card(2), card(4)], gross: [card(14), card(18)] },
      // A no-return or a withdrawal isn't a round's score.
      { venueSlug: "carnwath", nett: [card(-3), card(0, { noReturn: true })], gross: [card(10), card(30, { withdrawn: true })] },
      { venueSlug: "southerness", nett: [card(8), card(6)], gross: [card(20), card(22)] },
      { venueSlug: "dundonald", nett: [card(1)], gross: [card(9)] },
    ];
    const result = courseDifficulty(championships);
    expect(result.get("southerness")).toEqual({ nett: { average: 7, rounds: 2 }, gross: { average: 21, rounds: 2 }, rank: 1, tied: false, of: 3 });
    expect(result.get("carnwath")).toEqual({ nett: { average: 1, rounds: 3 }, gross: { average: 14, rounds: 3 }, rank: 2, tied: false, of: 3 });
    expect(result.get("dundonald")).toMatchObject({ rank: 3, of: 3 });
  });

  it("ties venues whose gross averages read the same to one decimal", () => {
    const result = courseDifficulty([
      { venueSlug: "a", nett: [card(1)], gross: [card(12.04)] },
      { venueSlug: "b", nett: [card(1)], gross: [card(12)] },
      { venueSlug: "c", nett: [card(1)], gross: [card(11)] },
    ]);
    expect([result.get("a")?.rank, result.get("a")?.tied, result.get("b")?.rank, result.get("b")?.tied, result.get("c")?.rank]).toEqual([1, true, 1, true, 3]);
  });

  it("leaves out a venue with no completed rounds", () => {
    expect(courseDifficulty([{ venueSlug: "a", nett: [card(0, { noReturn: true })], gross: [] }]).size).toBe(0);
  });
});
