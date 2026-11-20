import { describe, expect, it } from "vitest";

import { nineToPar } from "@/lib/data/scoring-statistics";
import { lowestWithEveryHolder, type ScoreEntry } from "@/lib/data/records";

const pars = [4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4].map((par) => ({ par }));

describe("nineToPar", () => {
  it("totals each nine against its own par", () => {
    const scores = pars.map((h, i) => (i === 0 ? h.par - 1 : i === 12 ? h.par + 2 : h.par));
    expect(nineToPar(scores, pars, 0)).toBe(-1);
    expect(nineToPar(scores, pars, 9)).toBe(2);
  });

  it("counts a completed front nine when the player picked up on the back nine", () => {
    const scores = pars.map((h, i) => (i < 9 ? h.par : i === 13 ? undefined : h.par));
    expect(nineToPar(scores, pars, 0)).toBe(0);
    expect(nineToPar(scores, pars, 9)).toBeUndefined();
  });
});

describe("lowestWithEveryHolder", () => {
  const entry = (year: number, name: string, value: number): ScoreEntry => ({ year, name, venueName: "Course", value });

  it("lists the five lowest", () => {
    const entries = [3, -1, 0, 2, -2, 1, 4].map((v, i) => entry(2013 + i, `P${i}`, v));
    expect(lowestWithEveryHolder(entries).map((e) => e.value)).toEqual([-2, -1, 0, 1, 2]);
  });

  it("keeps every joint holder of the record even past five", () => {
    const entries = [...Array.from({ length: 6 }, (_, i) => entry(2014 + i, `Holder${i}`, -3)), entry(2013, "Next", -2)];
    const list = lowestWithEveryHolder(entries);
    expect(list).toHaveLength(6);
    expect(list.every((e) => e.value === -3)).toBe(true);
    expect(list[0].year).toBe(2014);
  });
});
