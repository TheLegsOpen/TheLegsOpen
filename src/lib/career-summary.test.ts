import { describe, expect, it } from "vitest";

import { careerScoringAverage, formatAverageToPar, nineAverages, subParRounds, teeHalf, teeTimeAverages } from "@/lib/career-summary";

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

describe("nineAverages", () => {
  // Par 4s throughout; each nine's holes given as scores to par.
  const card = (front: (number | undefined)[], back: (number | undefined)[]) =>
    [...front, ...back].map((toPar, i) => ({ holeNumber: i + 1, par: 4, value: toPar === undefined ? undefined : 4 + toPar, relative: toPar ?? 0 }));
  const nine = (toPar: number) => [toPar, 0, 0, 0, 0, 0, 0, 0, 0];
  const missingLast = (toPar: number) => [toPar, 0, 0, 0, 0, 0, 0, 0, undefined];

  it("averages every complete nine to par, a no-return's finished front nine included", () => {
    const results = [
      { main: { toPar: 1, holes: card(nine(2), nine(-1)) }, scratch: { toPar: 19, holes: card(nine(9), nine(10)) } },
      // Picked up on the 17th: his front nine still counts, his back nine doesn't.
      { main: { toPar: 0, noReturn: true, holes: card(nine(4), missingLast(3)) }, scratch: { toPar: 0, noReturn: true, holes: card(nine(11), missingLast(9)) } },
      // A winner's year with no scorecard has no nines to give.
      { main: { toPar: -2 } },
    ];
    expect(nineAverages(results)).toEqual({
      nett: { front: { average: 3, rounds: 2 }, back: { average: -1, rounds: 1 } },
      gross: { front: { average: 10, rounds: 2 }, back: { average: 10, rounds: 1 } },
    });
  });

  it("leaves out a side with no complete nines", () => {
    expect(nineAverages([{ main: { toPar: 0, noReturn: true, holes: card(missingLast(2), missingLast(2)) } }])).toEqual({});
  });
});

describe("teeHalf", () => {
  it("splits a year's groups into the earlier and later half, on a 12-hour sheet with no am/pm", () => {
    const field = ["12.40", "12.20", "1.05", "12.30", "12.20"];
    // Groups in order: 12.20, 12.30, 12.40, 1.05.
    expect(teeHalf("12.20", field)).toBe("early");
    expect(teeHalf("12.30", field)).toBe("early");
    expect(teeHalf("12.40", field)).toBe("late");
    expect(teeHalf("1.05", field)).toBe("late");
  });

  it("puts the middle group of an odd number in neither half, and an unknown time nowhere", () => {
    const field = ["11.00", "11.10", "11.20"];
    expect(teeHalf("11.00", field)).toBe("early");
    expect(teeHalf("11.10", field)).toBeUndefined();
    expect(teeHalf("11.20", field)).toBe("late");
    expect(teeHalf("", field)).toBeUndefined();
  });
});

describe("teeTimeAverages", () => {
  it("averages completed rounds to par by half of the field, nett and gross", () => {
    const results = [
      { teeHalf: "early" as const, main: round(2), scratch: round(14) },
      { teeHalf: "early" as const, main: round(4), scratch: round(16) },
      { teeHalf: "late" as const, main: round(-1), scratch: round(11) },
      // A no-return, a middle group and a year with no tee sheet count for neither half.
      { teeHalf: "late" as const, main: round(0, { noReturn: true }), scratch: round(0, { noReturn: true }) },
      { main: round(9), scratch: round(20) },
    ];
    expect(teeTimeAverages(results)).toEqual({
      nett: { early: { average: 3, rounds: 2 }, late: { average: -1, rounds: 1 } },
      gross: { early: { average: 15, rounds: 2 }, late: { average: 11, rounds: 1 } },
    });
  });
});
