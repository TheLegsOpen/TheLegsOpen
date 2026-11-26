import { describe, expect, it } from "vitest";

import {
  assignPositions,
  birdieToBogeyRow,
  bounceBack,
  holesPerEagleRow,
  nineToPar,
  percentageRow,
  reverseBounceBack,
} from "@/lib/data/scoring-statistics";
import { lowestWithEveryHolder, topWithTies, type ScoreEntry } from "@/lib/data/records";
import type { StatRow } from "@/lib/statistics";

describe("holesPerEagleRow", () => {
  const player = { id: "1" } as unknown as StatRow["player"];

  it("divides holes played by eagles, fewest first", () => {
    const rows = [holesPerEagleRow(player, 18, 1), holesPerEagleRow(player, 14, 1), holesPerEagleRow(player, 36, 2)];
    expect(rows.map((r) => r.display)).toEqual(["18.0 (1 in 18)", "14.0 (1 in 14)", "18.0 (2 in 36)"]);
    rows.sort((a, b) => a.value - b.value);
    assignPositions(rows);
    expect(rows.map((r) => [r.display, r.position, r.tied])).toEqual([
      ["14.0 (1 in 14)", 1, false],
      ["18.0 (1 in 18)", 2, true],
      ["18.0 (2 in 36)", 2, true],
    ]);
  });
});

describe("percentageRow", () => {
  const player = { id: "1" } as unknown as StatRow["player"];

  it("shows one decimal with the count behind it", () => {
    expect(percentageRow(player, 3, 18).display).toBe("16.7% (3/18)");
  });

  it("ranks on the figure as shown, so two rates that read the same tie", () => {
    // A career's worth of holes: 31/248 is 12.50% and 32/255 is 12.55%, both 12.5% on the page.
    const rows = [percentageRow(player, 31, 248), percentageRow(player, 32, 255), percentageRow(player, 1, 18)];
    expect(rows.slice(0, 2).map((r) => r.display.split(" ")[0])).toEqual(["12.5%", "12.5%"]);
    rows.sort((a, b) => b.value - a.value);
    assignPositions(rows);
    expect(rows.map((r) => [r.position, r.tied])).toEqual([
      [1, true],
      [1, true],
      [3, false],
    ]);
  });
});

describe("assignPositions", () => {
  it("ties values that differ only by floating-point error", () => {
    // Strokes gained is a sum of field averages: three players on +2.72 came out as 9th, T10, T10.
    const values = [-2.7200000000000006, -2.72, -2.7199999999999998, -1.72];
    const rows = values.map((value, i) => ({ player: { id: String(i) }, value, display: "" }) as unknown as StatRow);
    assignPositions(rows);
    expect(rows.map((r) => [r.position, r.tied])).toEqual([
      [1, true],
      [1, true],
      [1, true],
      [4, false],
    ]);
  });
});

const pars = [4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4].map((par) => ({ par }));

describe("bounceBack", () => {
  it("counts an over-par hole followed by an under-par one", () => {
    // Bogey at 1, birdie at 2; double at 5, par at 6; bogey at 9, birdie at 10.
    const scores = pars.map((h, i) => (i === 0 || i === 8 ? h.par + 1 : i === 4 ? h.par + 2 : i === 1 || i === 9 ? h.par - 1 : h.par));
    expect(bounceBack(scores, pars)).toEqual({ chances: 3, bounced: 2 });
  });

  it("gives no chance after the 18th or before a hole without a score", () => {
    const scores = pars.map((h, i) => (i === 17 ? h.par + 1 : i === 3 ? h.par + 1 : i === 4 ? undefined : h.par));
    expect(bounceBack(scores, pars)).toEqual({ chances: 0, bounced: 0 });
  });
});

describe("birdieToBogeyRow", () => {
  const player = { id: "1" } as unknown as StatRow["player"];

  it("divides birdies by bogeys and shows the counts", () => {
    expect(birdieToBogeyRow(player, 3, 7)).toMatchObject({ display: "0.429 (3 to 7)" });
    expect(birdieToBogeyRow(player, 0, 9)).toMatchObject({ value: 0, display: "0.000 (0 to 9)" });
  });

  it("ranks a round without a bogey above every ratio, more birdies first", () => {
    const rows = [birdieToBogeyRow(player, 2, 0), birdieToBogeyRow(player, 9, 1), birdieToBogeyRow(player, 4, 0), birdieToBogeyRow(player, 2, 0)];
    expect(rows[0].display).toBe("2 to 0");
    rows.sort((a, b) => b.value - a.value);
    assignPositions(rows);
    expect(rows.map((r) => [r.display, r.position, r.tied])).toEqual([
      ["4 to 0", 1, false],
      ["2 to 0", 2, true],
      ["2 to 0", 2, true],
      ["9.000 (9 to 1)", 4, false],
    ]);
    // Survives the JSON the career tables are cached in.
    expect(JSON.parse(JSON.stringify(rows[0])).value).toBe(rows[0].value);
  });
});

describe("reverseBounceBack", () => {
  it("counts an under-par hole followed by an over-par one", () => {
    // Birdie at 1, bogey at 2; eagle at 5, par at 6; birdie at 18 has no next hole.
    const scores = pars.map((h, i) => (i === 0 || i === 17 ? h.par - 1 : i === 4 ? h.par - 2 : i === 1 ? h.par + 1 : h.par));
    expect(reverseBounceBack(scores, pars)).toEqual({ chances: 2, bounced: 1 });
  });
});

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

describe("topWithTies", () => {
  it("keeps everyone level with the fifth", () => {
    const margins = [7, 5, 2, 2, 2, 2, 2, 2, 2, 1];
    expect(topWithTies(margins, (m) => m)).toEqual([7, 5, 2, 2, 2, 2, 2, 2, 2]);
  });

  it("stops at five when the sixth is not level", () => {
    expect(topWithTies([1, 2, 3, 4, 5, 6], (m) => m)).toEqual([1, 2, 3, 4, 5]);
  });

  it("lists past five when players are level with the fifth best", () => {
    const entry = (year: number, value: number): ScoreEntry => ({ year, name: `P${year}`, venueName: "Course", value });
    const list = lowestWithEveryHolder([-4, -3, -2, -1, 0, 0, 0, 1].map((v, i) => entry(2013 + i, v)));
    expect(list.map((e) => e.value)).toEqual([-4, -3, -2, -1, 0, 0, 0]);
  });
});
