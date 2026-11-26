import { describe, expect, it } from "vitest";

import { careerScoringAverage, formatAverageToPar } from "@/lib/career-summary";

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

describe("formatAverageToPar", () => {
  it("shows one decimal and a sign, and level par as E", () => {
    expect(formatAverageToPar(7.43)).toBe("+7.4");
    expect(formatAverageToPar(-0.25)).toBe("-0.3");
    expect(formatAverageToPar(0.04)).toBe("E");
  });
});
