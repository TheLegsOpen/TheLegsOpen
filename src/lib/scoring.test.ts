import { describe, expect, it } from "vitest";

import { allocateStrokes, computeScorecardTotals, stablefordPoints, type HoleInfo } from "@/lib/scoring";

/** 18 holes, all par 4, stroke indices 1-18 -- a simple, deterministic course for the tests below. */
const FLAT_HOLES: HoleInfo[] = Array.from({ length: 18 }, (_, i) => ({ par: 4, si: i + 1 }));

describe("allocateStrokes", () => {
  it("gives one stroke per hole for a handicap of 18", () => {
    expect(allocateStrokes(18, FLAT_HOLES)).toEqual(Array(18).fill(1));
  });

  it("gives strokes only to the hardest holes for a handicap under 18", () => {
    const strokes = allocateStrokes(6, FLAT_HOLES);
    expect(strokes.filter((s) => s === 1)).toHaveLength(6);
    expect(strokes.slice(0, 6)).toEqual(Array(6).fill(1));
    expect(strokes.slice(6)).toEqual(Array(12).fill(0));
  });

  it("stacks a second stroke on the hardest holes above 18", () => {
    const strokes = allocateStrokes(20, FLAT_HOLES);
    expect(strokes[0]).toBe(2);
    expect(strokes[1]).toBe(2);
    expect(strokes[2]).toBe(1);
  });
});

describe("stablefordPoints", () => {
  it.each([
    [2, 4, 4], // eagle -> 4 pts
    [3, 4, 3], // birdie -> 3 pts
    [4, 4, 2], // par -> 2 pts
    [5, 4, 1], // bogey -> 1 pt
    [6, 4, 0], // double bogey -> 0 pts
    [9, 4, 0], // never negative
  ])("nett %i vs par %i scores %i points", (nett, par, expected) => {
    expect(stablefordPoints(nett, par)).toBe(expected);
  });
});

describe("computeScorecardTotals — competition independence", () => {
  // A scratch handicap-6 player who plays every hole to gross par except a birdie on hole 1
  // (stroke index 1, so they receive a shot there) and a bogey on hole 10.
  const strokes = FLAT_HOLES.map((_, i) => (i === 0 ? 3 : i === 9 ? 5 : 4));
  const noReturn = Array(18).fill(false);
  const totals = computeScorecardTotals(strokes, noReturn, FLAT_HOLES, 6);

  it("computes gross (Scratch) independently of handicap", () => {
    expect(totals.grossTotal).toBe(3 + 5 + 4 * 16);
    expect(totals.toParGross).toBe(totals.grossTotal - 18 * 4);
  });

  it("computes nett (Main) using the handicap's stroke allocation", () => {
    // Holes 1-6 receive a stroke (handicap 6, ascending stroke index) -- hole 1's gross 3 becomes
    // nett 2, hole 10's gross 5 (no stroke there) stays nett 5.
    expect(totals.nettTotal).toBe(totals.grossTotal - 6);
    expect(totals.toParNett).toBe(totals.nettTotal - 18 * 4);
  });

  it("computes Stableford from nett scores, not gross", () => {
    // Rebuild expected Stableford independently to confirm it isn't derived from grossTotal/nettTotal.
    const strokesReceived = allocateStrokes(6, FLAT_HOLES);
    const expectedPoints = strokes.reduce((sum, gross, i) => sum + stablefordPoints(gross - strokesReceived[i], FLAT_HOLES[i].par), 0);
    expect(totals.stablefordTotal).toBe(expectedPoints);
  });

  it("two players with identical strokes and handicaps produce identical totals (a true tie)", () => {
    const other = computeScorecardTotals(strokes, noReturn, FLAT_HOLES, 6);
    expect(other).toEqual(totals);
  });

  it("only counts played holes for a partial round", () => {
    const partialStrokes = strokes.map((s, i) => (i < 9 ? s : null));
    const partial = computeScorecardTotals(partialStrokes, noReturn, FLAT_HOLES, 6);
    expect(partial.holesCompleted).toBe(9);
  });
});

describe("computeScorecardTotals — no-return (X)", () => {
  const strokes = FLAT_HOLES.map((_, i) => (i === 4 ? null : 4));
  const noReturn = FLAT_HOLES.map((_, i) => i === 4);

  it("flags the whole card no-return when any hole is marked X", () => {
    const totals = computeScorecardTotals(strokes, noReturn, FLAT_HOLES, 0);
    expect(totals.noReturn).toBe(true);
  });

  it("still counts the X'd hole toward holes completed", () => {
    const totals = computeScorecardTotals(strokes, noReturn, FLAT_HOLES, 0);
    expect(totals.holesCompleted).toBe(18);
  });

  it("excludes the X'd hole from gross/nett totals (Main/Scratch effectively disqualified upstream)", () => {
    const totals = computeScorecardTotals(strokes, noReturn, FLAT_HOLES, 0);
    expect(totals.grossTotal).toBe(4 * 17);
  });

  it("scores 0 Stableford points for the X'd hole but keeps accumulating on the rest", () => {
    const totals = computeScorecardTotals(strokes, noReturn, FLAT_HOLES, 0);
    const expectedPoints = 17 * stablefordPoints(4, 4); // 17 pars worth of points, X'd hole contributes 0
    expect(totals.stablefordTotal).toBe(expectedPoints);
  });
});
