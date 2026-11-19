import { describe, expect, it } from "vitest";

import { matchPlayHoles, matchPlayResult } from "./match-play";
import type { HoleScore } from "@/lib/data/scorecards";

const card = (values: (number | undefined)[]): HoleScore[] =>
  values.map((value, i) => ({ holeNumber: i + 1, par: 4, value, relative: value === undefined ? 0 : value - 4 }));
const level = Array(18).fill(4);

describe("matchPlayResult", () => {
  it("is all square when every hole is halved", () => {
    expect(matchPlayResult(card(level), card(level))).toEqual({ outcome: "halved", label: "A/S" });
  });

  it("ends the match once the lead is bigger than the holes left", () => {
    // Wins holes 1-3, halves the rest: still 3 up after 16 with two to play = "3 & 2".
    const a = card([3, 3, 3, ...Array(15).fill(4)]);
    expect(matchPlayResult(a, card(level))).toEqual({ outcome: "won", label: "Won 3 & 2" });
  });

  it("reports a loss from the first player's side", () => {
    const b = card([3, 3, ...Array(16).fill(4)]);
    // 2 down after 2, halved through 17 -> 2 down with 1 to play = "2 & 1"
    expect(matchPlayResult(card(level), b)).toEqual({ outcome: "lost", label: "Lost 2 & 1" });
  });

  it("writes a match decided on the 18th as Up", () => {
    const a = card([...Array(17).fill(4), 3]);
    expect(matchPlayResult(a, card(level))).toEqual({ outcome: "won", label: "Won 1 Up" });
  });

  it("gives a picked-up hole to the other player", () => {
    const a = card([undefined, ...Array(17).fill(4)]);
    expect(matchPlayResult(a, card(level))).toEqual({ outcome: "lost", label: "Lost 1 Up" });
  });

  it("returns nothing without hole-by-hole cards", () => {
    expect(matchPlayResult(undefined, card(level))).toBeUndefined();
    expect(matchPlayResult(card(Array(18).fill(undefined)), card(level))).toBeUndefined();
  });
});

describe("matchPlayHoles", () => {
  it("records each hole and marks the holes after the match was decided as unplayed", () => {
    const a = card([3, 3, 3, ...Array(15).fill(4)]);
    const m = matchPlayHoles(a, card(level))!;
    expect(m.result.label).toBe("Won 3 & 2");
    expect(m.decidedOn).toBe(16);
    expect(m.holes.slice(0, 3)).toEqual(["won", "won", "won"]);
    expect(m.holes.slice(3, 16).every((h) => h === "halved")).toBe(true);
    expect(m.holes.slice(16)).toEqual(["unplayed", "unplayed"]);
  });

  it("plays all 18 for a match decided on the last hole", () => {
    const b = card([...Array(17).fill(4), 3]);
    const m = matchPlayHoles(card(level), b)!;
    expect(m.result.label).toBe("Lost 1 Up");
    expect(m.decidedOn).toBeUndefined();
    expect(m.holes[17]).toBe("lost");
    expect(m.holes).not.toContain("unplayed");
  });

  it("agrees with matchPlayResult", () => {
    const a = card([5, 3, 4, 6, 4, 4, 3, 4, 4, 5, 4, 4, 3, 4, 4, 4, 4, 4]);
    expect(matchPlayHoles(a, card(level))!.result).toEqual(matchPlayResult(a, card(level)));
  });
});
