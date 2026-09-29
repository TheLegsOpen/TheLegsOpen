import { describe, expect, it } from "vitest";

import { applyPlayoffToEntries, resolveTiebreak, type PlayoffResult } from "@/lib/data/playoffs";
import type { CompetitionEntry } from "@/lib/data/scorecards";
import type { Player } from "@/types/player";

function player(id: string, name: string): Player {
  return { id, name, country: "Scotland", countryCode: "gb-sct", previousOpens: 0, bio: null };
}

function entry(p: Player, over: Partial<CompetitionEntry>): CompetitionEntry {
  return { position: 1, tied: false, player: p, started: true, thru: "F", teeTime: "12.20", holes: [], ...over };
}

const PARK = player("park", "Kevin Park");
const MAGOWAN = player("magowan", "Stephen Magowan");
const WATTERS = player("watters", "Colum Watters");
const DUNCAN = player("duncan", "Andrew Duncan");

function step(contenders: Player[], survivors: Player[] = []) {
  return {
    label: "First Tiebreaker",
    description: "Holes 1, 2, 17 & 18",
    holeIndices: [0, 1, 16, 17],
    contenders: contenders.map((p) => ({ player: p, display: "10", value: 10 })),
    survivors,
  };
}

describe("applyPlayoffToEntries", () => {
  /**
   * St Andrews, 2020. Park's 39 points put him clear at the top of the Stableford, but the Main
   * champion can't take that title, so the countback that decided it was between Magowan and
   * Colum Watters on 33 -- a place further down. The board showed them as T2 with no indication
   * that one of them had won a championship.
   */
  it("re-ranks a tie decided below an ineligible leader, without disturbing the leader", () => {
    const entries = [
      entry(PARK, { score: 39, position: 1 }),
      entry(WATTERS, { score: 33, position: 2, tied: true }),
      entry(MAGOWAN, { score: 33, position: 2, tied: true }),
      entry(DUNCAN, { score: 31, position: 4 }),
    ];
    const playoff: PlayoffResult = {
      competition: "stableford",
      competitionLabel: "Stableford",
      steps: [step([MAGOWAN, WATTERS], [MAGOWAN])],
      winner: MAGOWAN,
      stillTied: false,
      ineligible: [],
    };

    const ranked = applyPlayoffToEntries(entries, playoff);
    const by = (id: string) => ranked.find((e) => e.player.id === id)!;

    expect(by("park").position).toBe(1);
    expect(by("park").playoffNote).toBeUndefined();

    expect(by("magowan").position).toBe(2);
    expect(by("magowan").tied).toBe(false);
    expect(by("magowan").playoffNote?.label).toBe("Won First Tiebreaker");

    expect(by("watters").position).toBe(3);
    expect(by("watters").playoffNote?.label).toBe("Lost First Tiebreaker");

    // And the rows come back in the order they should be drawn.
    expect(ranked.map((e) => e.player.id)).toEqual(["park", "magowan", "watters", "duncan"]);
  });

  it("still promotes a winner tied for first, as the Main does", () => {
    const entries = [
      entry(WATTERS, { toPar: 2, position: 1, tied: true }),
      entry(MAGOWAN, { toPar: 2, position: 1, tied: true }),
      entry(DUNCAN, { toPar: 5, position: 3 }),
    ];
    const playoff: PlayoffResult = {
      competition: "main",
      competitionLabel: "Main",
      steps: [step([MAGOWAN, WATTERS], [MAGOWAN])],
      winner: MAGOWAN,
      stillTied: false,
      ineligible: [],
    };

    const ranked = applyPlayoffToEntries(entries, playoff);
    expect(ranked.find((e) => e.player.id === "magowan")!.position).toBe(1);
    expect(ranked.find((e) => e.player.id === "magowan")!.tied).toBe(false);
    expect(ranked.find((e) => e.player.id === "watters")!.position).toBe(2);
  });

  it("marks the Main champion ineligible when he was part of the tie", () => {
    const entries = [
      entry(PARK, { score: 33, position: 1, tied: true }),
      entry(MAGOWAN, { score: 33, position: 1, tied: true }),
      entry(DUNCAN, { score: 30, position: 3 }),
    ];
    const playoff: PlayoffResult = {
      competition: "stableford",
      competitionLabel: "Stableford",
      steps: [],
      winner: MAGOWAN,
      stillTied: false,
      ineligible: [PARK],
    };

    const ranked = applyPlayoffToEntries(entries, playoff);
    expect(ranked.find((e) => e.player.id === "magowan")!.position).toBe(1);
    expect(ranked.find((e) => e.player.id === "park")!.playoffNote?.label).toBe("Ineligible");
    expect(ranked.find((e) => e.player.id === "park")!.position).toBe(2);
  });

  it("leaves everything alone when the tie was never resolved", () => {
    const entries = [entry(MAGOWAN, { score: 33, position: 1, tied: true }), entry(WATTERS, { score: 33, position: 1, tied: true })];
    const playoff: PlayoffResult = {
      competition: "stableford",
      competitionLabel: "Stableford",
      steps: [step([MAGOWAN, WATTERS], [MAGOWAN, WATTERS])],
      winner: undefined,
      stillTied: true,
      ineligible: [],
    };
    expect(applyPlayoffToEntries(entries, playoff)).toEqual(entries);
  });
});

describe("resolveTiebreak reports a figure the competition recognises", () => {
  /** Four holes, so the difference between points and points-minus-two is obvious. */
  function withHoles(p: Player, points: number[], over: Partial<CompetitionEntry> = {}): CompetitionEntry {
    return entry(p, {
      score: points.reduce((a, b) => a + b, 0),
      holes: Array.from({ length: 18 }, (_, i) => ({
        holeNumber: i + 1,
        par: 4,
        value: points[i] ?? 0,
        relative: (points[i] ?? 0) - 2,
      })),
      ...over,
    });
  }

  it("counts Stableford in points, not strokes against par", () => {
    // Magowan finishes 2,3 for 5 points over the inward nine; Colum Watters 0,1 for 1. The board
    // announced this as "(+2)" against "(-3)" -- the same ranking, expressed as a number that
    // means nothing on a points competition.
    const magowanPoints = [3, 2, ...Array(14).fill(0), 2, 3];
    const wattersPoints = [2, 2, ...Array(14).fill(0), 0, 1];
    const { steps, winner } = resolveTiebreak(
      [withHoles(MAGOWAN, magowanPoints), withHoles(WATTERS, wattersPoints)],
      "stableford",
    );
    expect(winner?.id).toBe("magowan");
    const first = steps[0].contenders;
    expect(first.find((c) => c.player.id === "magowan")?.display).toBe("5 pts");
    expect(first.find((c) => c.player.id === "watters")?.display).toBe("1 pts");
  });

  it("still counts Main against par", () => {
    const { steps } = resolveTiebreak(
      [withHoles(MAGOWAN, [1, 2, ...Array(14).fill(2), 2, 2]), withHoles(WATTERS, [2, 2, ...Array(14).fill(2), 2, 2])],
      "main",
    );
    expect(steps[0].contenders.every((c) => /^[+-]|^E$/.test(c.display))).toBe(true);
  });
});

describe("the two competitions count back on different holes", () => {
  const EADIE = player("eadie", "Neal Eadie");
  const SINTON = player("sinton", "Tom Sinton");
  const FERGUSON = player("ferguson", "Bobby Ferguson");
  const CAMPBELL = player("campbell", "Alastair Campbell");

  /** Stableford holes carry the points themselves; Main holes carry strokes against par. */
  function withHoles(p: Player, per: number[], stableford: boolean): CompetitionEntry {
    return entry(p, {
      score: stableford ? per.reduce((a, b) => a + b, 0) : undefined,
      holes: Array.from({ length: 18 }, (_, i) => ({
        holeNumber: i + 1,
        par: 4,
        value: stableford ? per[i] : 4 + per[i],
        relative: stableford ? per[i] - 2 : per[i],
      })),
    });
  }

  /**
   * Loch Lomond, 2022. Swan's 36 topped the Stableford but he had already won the Main, leaving
   * four level on 34. Eadie's 19 points coming home won it; on holes 1, 2, 17 & 18 Sinton's 9 to
   * Eadie's 6 would have taken it the other way.
   */
  it("settles the Stableford on the inward nine", () => {
    const eadie = [2, 1, 1, 0, 1, 4, 2, 2, 2, 2, 2, 2, 2, 3, 2, 3, 2, 1];
    const sinton = [2, 2, 1, 2, 2, 3, 2, 3, 3, 1, 2, 0, 2, 2, 1, 1, 2, 3];
    const { steps, winner } = resolveTiebreak(
      [withHoles(EADIE, eadie, true), withHoles(SINTON, sinton, true)],
      "stableford",
    );

    expect(steps[0].description).toBe("Holes 10–18");
    expect(winner?.id).toBe("eadie");
    expect(steps[0].contenders.find((c) => c.player.id === "eadie")?.display).toBe("19 pts");
    expect(steps[0].contenders.find((c) => c.player.id === "sinton")?.display).toBe("14 pts");
  });

  it("never opens a Stableford countback on holes 1, 2, 17 & 18", () => {
    const flat = Array(18).fill(2);
    const { steps } = resolveTiebreak([withHoles(EADIE, flat, true), withHoles(SINTON, flat, true)], "stableford");
    expect(steps.map((s) => s.description)).not.toContain("Holes 1, 2, 17 & 18");
  });

  /**
   * Carnwath, 2013. Ferguson and Campbell tied on nett 65. Holes 1, 2, 17 & 18 separate them and
   * the back nine does not (both -3, the last six then favouring Ferguson), so the Main keeping
   * its own order is what makes Campbell the champion.
   */
  it("still settles the Main on holes 1, 2, 17 & 18", () => {
    // Only the four countback holes carry anything; the rest are level so the back nine ties.
    const campbell = [-1, -1, ...Array(14).fill(0), 0, 0];
    const ferguson = [0, 0, ...Array(14).fill(0), 0, 0];
    const { steps, winner } = resolveTiebreak(
      [withHoles(CAMPBELL, campbell, false), withHoles(FERGUSON, ferguson, false)],
      "main",
    );

    expect(steps[0].description).toBe("Holes 1, 2, 17 & 18");
    expect(winner?.id).toBe("campbell");
  });
});
