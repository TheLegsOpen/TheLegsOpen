import { describe, expect, it } from "vitest";

import { championAfterNine, runningTotalsByPlayer } from "@/lib/data/championship-stats";
import type { CompetitionEntry, HoleScore } from "@/lib/data/scorecards";
import type { Player } from "@/types/player";

/** A Main entry from per-hole scores relative to par; "NR" is a pickup, undefined not yet played. */
function entry(id: string, relatives: (number | "NR" | undefined)[], noReturn = false): CompetitionEntry {
  const holes: HoleScore[] = Array.from({ length: 18 }, (_, i) => {
    const r = relatives[i];
    if (r === "NR") return { holeNumber: i + 1, par: 4, relative: 0, noReturn: true };
    if (r === undefined) return { holeNumber: i + 1, par: 4, relative: 0 };
    return { holeNumber: i + 1, par: 4, value: 4 + r, relative: r };
  });
  return {
    position: 1,
    tied: false,
    player: { id, name: id } as Player,
    started: true,
    thru: "F",
    teeTime: "",
    holes,
    noReturn,
  };
}

const nine = (...front: number[]) => [...front, ...Array(9).fill(0)];

describe("championAfterNine", () => {
  it("is an outright lead only when nobody is level", () => {
    const totals = runningTotalsByPlayer([entry("champ", nine(-1, 0, 0, 0, 0, 0, 0, 0, 0)), entry("other", nine(0, 0, 0, 0, 0, 0, 0, 0, 0))]);
    expect(championAfterNine(totals, "champ")).toEqual({ ledOutright: true });
  });

  it("treats a share of the lead as neither an outright lead nor a deficit (Swan and Sinton, 2022)", () => {
    const totals = runningTotalsByPlayer([entry("champ", nine(-1, -1)), entry("other", nine(-2))]);
    expect(championAfterNine(totals, "champ")).toEqual({ ledOutright: false, deficit: 0 });
  });

  it("counts a player who later returned no card, for the holes before his pickup (Magowan, 2019)", () => {
    const pickedUpLater = entry("nr", [...nine(-1), "NR"], true);
    const totals = runningTotalsByPlayer([entry("champ", nine(-1)), pickedUpLater]);
    expect(championAfterNine(totals, "champ")).toEqual({ ledOutright: false, deficit: 0 });
  });

  it("ignores a no-return who picked up before the turn", () => {
    const pickedUpEarly = entry("nr", [-3, -3, "NR"], true);
    const totals = runningTotalsByPlayer([entry("champ", nine(-1)), entry("other", nine(0)), pickedUpEarly]);
    expect(totals.get("nr")).toEqual([-3, -6]);
    expect(championAfterNine(totals, "champ")).toEqual({ ledOutright: true });
  });

  it("gives the champion's own gap to the leader when behind", () => {
    const totals = runningTotalsByPlayer([entry("champ", nine(2)), entry("second", nine(1)), entry("leader", nine(-3))]);
    expect(championAfterNine(totals, "champ")).toEqual({ ledOutright: false, deficit: 5 });
  });
});
