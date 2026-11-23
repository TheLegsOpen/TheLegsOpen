import { describe, expect, it } from "vitest";
import { positionLabel, topWithTies } from "@/lib/leaderboard";

const row = (position: number, extra: Partial<{ started: boolean; noReturn: boolean }> = {}) => ({ position, started: true, ...extra });

describe("topWithTies", () => {
  it("keeps everyone tied with the last row shown", () => {
    const entries = [1, 2, 3, 4, 4, 6, 7, 7, 9, 9, 9, 12].map((p) => row(p));
    expect(topWithTies(entries, 10)).toHaveLength(11);
  });

  it("stops at the count when the next row is not tied", () => {
    const entries = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((p) => row(p));
    expect(topWithTies(entries, 10)).toHaveLength(10);
  });

  it("does not run on through a field that has not teed off", () => {
    const entries = Array.from({ length: 30 }, () => row(1, { started: false }));
    expect(topWithTies(entries, 10)).toHaveLength(10);
  });

  it("does not run on through no-returns", () => {
    const entries = Array.from({ length: 20 }, () => row(5, { noReturn: true }));
    expect(topWithTies(entries, 10)).toHaveLength(10);
  });

  it("copes with a list shorter than the count", () => {
    expect(topWithTies([row(1), row(1)], 10)).toHaveLength(2);
  });
});

describe("positionLabel", () => {
  it("prints a tied position with its T", () => {
    expect(positionLabel({ position: 9, tied: true })).toBe("T9");
  });

  it("prints a sole position bare", () => {
    expect(positionLabel({ position: 12, tied: false })).toBe("12");
  });

  it("shows NR for a no-return", () => {
    expect(positionLabel({ position: 29, tied: true, noReturn: true })).toBe("NR");
  });

  it("shows WD for a withdrawal, even one that also picked up", () => {
    expect(positionLabel({ position: 37, tied: false, withdrawn: true, noReturn: true })).toBe("WD");
  });
});
