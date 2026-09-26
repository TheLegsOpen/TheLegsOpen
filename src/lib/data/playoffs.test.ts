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
    // Magowan 3,2 … 2,3 on holes 1, 2, 17 and 18 = 10 points. Colum Watters 2,2 … 0,1 = 5.
    // The board announced this as "(+2)" against "(-3)" -- the same ranking, expressed as a
    // number that means nothing on a points competition.
    const magowanPoints = [3, 2, ...Array(14).fill(0), 2, 3];
    const wattersPoints = [2, 2, ...Array(14).fill(0), 0, 1];
    const { steps, winner } = resolveTiebreak(
      [withHoles(MAGOWAN, magowanPoints), withHoles(WATTERS, wattersPoints)],
      "stableford",
    );
    expect(winner?.id).toBe("magowan");
    const first = steps[0].contenders;
    expect(first.find((c) => c.player.id === "magowan")?.display).toBe("10 pts");
    expect(first.find((c) => c.player.id === "watters")?.display).toBe("5 pts");
  });

  it("still counts Main against par", () => {
    const { steps } = resolveTiebreak(
      [withHoles(MAGOWAN, [1, 2, ...Array(14).fill(2), 2, 2]), withHoles(WATTERS, [2, 2, ...Array(14).fill(2), 2, 2])],
      "main",
    );
    expect(steps[0].contenders.every((c) => /^[+-]|^E$/.test(c.display))).toBe(true);
  });
});
