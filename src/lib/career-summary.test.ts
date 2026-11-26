import { describe, expect, it } from "vitest";

import { careerScoringAverage, formatAverageToPar, subParRounds } from "@/lib/career-summary";

const round = (toPar: number, extra: { noReturn?: boolean; withdrawn?: boolean } = {}) => ({ position: 1, tied: false, toPar, ...extra });

describe("careerScoringAverage", () => {
  it("averages nett and gross to par over completed rounds only", () => {
    const results = [
      { main: round(2), scratch: round(14) },
      { main: round(-1), scratch: round(9) },
      // A no-return counts for neither: it isn't a completed round.
      { main: round(0, { noReturn: true }), scratch: round(0, { noReturn: true }) },
      { main: round(6, { withdrawn: true }), scratch: round(20, { withdrawn: true }) },
      { main: round(5), scratch: round(16) },
    ];
    expect(careerScoringAverage(results)).toEqual({ nett: { average: 2, rounds: 3 }, gross: { average: 13, rounds: 3 } });
  });

  it("has nothing to show for a player who has never completed a round", () => {
    expect(careerScoringAverage([{ main: round(0, { noReturn: true }) }])).toEqual({});
  });
});

describe("subParRounds", () => {
  it("counts rounds under par and the most in a row, oldest first, with level par and a no-return ending a run", () => {
    // Given newest first, as getPlayerResults returns them.
    const results = [
      { year: 2026, main: round(-1), scratch: round(9) },
      { year: 2025, main: round(-2), scratch: round(8) },
      { year: 2024, main: round(-1, { noReturn: true }), scratch: round(0, { noReturn: true }) },
      { year: 2022, main: round(-3), scratch: round(7) },
      { year: 2021, main: round(-1), scratch: round(6) },
      { year: 2020, main: round(-2), scratch: round(5) },
      { year: 2019, main: round(0), scratch: round(4) },
      { year: 2018, main: round(-4), scratch: round(-1) },
    ];
    expect(subParRounds(results)).toEqual({ nett: { rounds: 6, bestStreak: 3 }, gross: { rounds: 1, bestStreak: 1 } });
  });

  it("is nought for a player who has never been under par", () => {
    expect(subParRounds([{ year: 2026, main: round(4), scratch: round(16) }])).toEqual({ nett: { rounds: 0, bestStreak: 0 }, gross: { rounds: 0, bestStreak: 0 } });
  });
});

describe("formatAverageToPar", () => {
  it("shows one decimal and a sign, and level par as E", () => {
    expect(formatAverageToPar(7.43)).toBe("+7.4");
    expect(formatAverageToPar(-0.25)).toBe("-0.3");
    expect(formatAverageToPar(0.04)).toBe("E");
  });
});
