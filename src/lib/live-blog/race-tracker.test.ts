import { describe, expect, it } from "vitest";

import { buildRaceTracker, diffPositionMovement, diffRaceTrackers } from "@/lib/live-blog/race-tracker";
import type { CompetitionEntry } from "@/lib/data/scorecards";
import type { Player } from "@/types/player";

function makePlayer(id: string, name = id): Player {
  return { id, name, country: "Scotland", countryCode: "gb-sct", previousOpens: 0, bio: [] };
}

function makeEntry(overrides: Partial<CompetitionEntry> & { player: Player }): CompetitionEntry {
  return {
    position: 1,
    tied: false,
    started: true,
    thru: "10",
    teeTime: "10.00",
    holes: [],
    ...overrides,
  };
}

describe("buildRaceTracker", () => {
  it("returns an empty tracker when nobody has started", () => {
    const entries = [makeEntry({ player: makePlayer("a"), started: false, thru: "-", toPar: 0 })];
    const tracker = buildRaceTracker(entries, "main");
    expect(tracker.leaderIds).toEqual([]);
    expect(tracker.members).toEqual([]);
  });

  it("identifies the sole leader and lead margin for a strokeplay competition (lower toPar wins)", () => {
    const entries = [
      makeEntry({ player: makePlayer("a"), toPar: -2 }),
      makeEntry({ player: makePlayer("b"), toPar: 1 }),
    ];
    const tracker = buildRaceTracker(entries, "main");
    expect(tracker.leaderIds).toEqual(["a"]);
    expect(tracker.leadMargin).toBe(3);
  });

  it("identifies a share of the lead when two players are level", () => {
    const entries = [
      makeEntry({ player: makePlayer("a"), toPar: -1 }),
      makeEntry({ player: makePlayer("b"), toPar: -1 }),
      makeEntry({ player: makePlayer("c"), toPar: 2 }),
    ];
    const tracker = buildRaceTracker(entries, "main");
    expect(tracker.leaderIds.sort()).toEqual(["a", "b"]);
  });

  it("higher Stableford points win, unlike strokeplay", () => {
    const entries = [
      makeEntry({ player: makePlayer("a"), score: 30 }),
      makeEntry({ player: makePlayer("b"), score: 34 }),
    ];
    const tracker = buildRaceTracker(entries, "stableford");
    expect(tracker.leaderIds).toEqual(["b"]);
  });

  it("excludes a no-return (disqualified) player from leader calculation entirely", () => {
    const entries = [
      makeEntry({ player: makePlayer("a"), toPar: undefined, noReturn: true }),
      makeEntry({ player: makePlayer("b"), toPar: 3 }),
    ];
    const tracker = buildRaceTracker(entries, "main");
    expect(tracker.leaderIds).toEqual(["b"]);
  });

  it("only includes players within the contention margin as members", () => {
    const entries = [
      makeEntry({ player: makePlayer("leader"), toPar: 0, thru: "10" }),
      makeEntry({ player: makePlayer("close"), toPar: 2, thru: "10" }), // within margin for >6 holes remaining
      makeEntry({ player: makePlayer("far"), toPar: 12, thru: "10" }),
    ];
    const tracker = buildRaceTracker(entries, "main");
    const memberIds = tracker.members.map((m) => m.playerId);
    expect(memberIds).toContain("leader");
    expect(memberIds).toContain("close");
    expect(memberIds).not.toContain("far");
  });
});

describe("diffRaceTrackers", () => {
  it("emits new-leader when the sole leader changes", () => {
    const before = buildRaceTracker([makeEntry({ player: makePlayer("a"), toPar: -1 }), makeEntry({ player: makePlayer("b"), toPar: 0 })], "main");
    const after = buildRaceTracker([makeEntry({ player: makePlayer("a"), toPar: -1 }), makeEntry({ player: makePlayer("b"), toPar: -2 })], "main");
    const candidates = diffRaceTrackers(before, after);
    expect(candidates).toContainEqual(expect.objectContaining({ kind: "new-leader", playerId: "b" }));
  });

  it("emits tie-for-lead when a second player joins the existing sole leader", () => {
    const before = buildRaceTracker([makeEntry({ player: makePlayer("a"), toPar: -1 }), makeEntry({ player: makePlayer("b"), toPar: 0 })], "main");
    const after = buildRaceTracker([makeEntry({ player: makePlayer("a"), toPar: -1 }), makeEntry({ player: makePlayer("b"), toPar: -1 })], "main");
    const candidates = diffRaceTrackers(before, after);
    expect(candidates).toContainEqual(expect.objectContaining({ kind: "tie-for-lead", playerId: "b" }));
  });

  it("emits lead-extends when the same sole leader's margin grows", () => {
    const before = buildRaceTracker([makeEntry({ player: makePlayer("a"), toPar: -1 }), makeEntry({ player: makePlayer("b"), toPar: 0 })], "main");
    const after = buildRaceTracker([makeEntry({ player: makePlayer("a"), toPar: -3 }), makeEntry({ player: makePlayer("b"), toPar: 0 })], "main");
    const candidates = diffRaceTrackers(before, after);
    expect(candidates).toContainEqual(expect.objectContaining({ kind: "lead-extends", playerId: "a", leadMargin: 3 }));
  });

  it("does not emit lead-extends for a leader who loses ground", () => {
    const before = buildRaceTracker([makeEntry({ player: makePlayer("a"), toPar: -3 }), makeEntry({ player: makePlayer("b"), toPar: 0 })], "main");
    const after = buildRaceTracker([makeEntry({ player: makePlayer("a"), toPar: -1 }), makeEntry({ player: makePlayer("b"), toPar: 0 })], "main");
    const candidates = diffRaceTrackers(before, after);
    expect(candidates.find((c) => c.kind === "lead-extends")).toBeUndefined();
  });

  it("emits entering-contention and leaving-contention as members cross the margin", () => {
    const before = buildRaceTracker(
      [makeEntry({ player: makePlayer("leader"), toPar: 0 }), makeEntry({ player: makePlayer("mover"), toPar: 20 })],
      "main",
    );
    const after = buildRaceTracker(
      [makeEntry({ player: makePlayer("leader"), toPar: 0 }), makeEntry({ player: makePlayer("mover"), toPar: 2 })],
      "main",
      new Set(before.members.map((m) => m.playerId)),
    );
    const candidates = diffRaceTrackers(before, after);
    expect(candidates).toContainEqual(expect.objectContaining({ kind: "entering-contention", playerId: "mover" }));
  });
});

describe("diffPositionMovement", () => {
  const before = [
    makeEntry({ player: makePlayer("a"), position: 12 }),
    makeEntry({ player: makePlayer("b"), position: 7 }),
    makeEntry({ player: makePlayer("c"), position: 13 }),
  ];

  it("ignores a routine one-place move (12th -> 11th)", () => {
    const after = [
      makeEntry({ player: makePlayer("a"), position: 11 }),
      makeEntry({ player: makePlayer("b"), position: 7 }),
      makeEntry({ player: makePlayer("c"), position: 13 }),
    ];
    expect(diffPositionMovement(before, after, "a")).toBeUndefined();
  });

  it("flags entering the top 5", () => {
    const after = [
      makeEntry({ player: makePlayer("a"), position: 12 }),
      makeEntry({ player: makePlayer("b"), position: 4 }),
      makeEntry({ player: makePlayer("c"), position: 13 }),
    ];
    expect(diffPositionMovement(before, after, "b")).toEqual(
      expect.objectContaining({ kind: "enter-top-5", beforePosition: 7, position: 4 }),
    );
  });

  it("flags a big gain (5+ places) that doesn't cross into the top 5/10", () => {
    const bigBefore = [makeEntry({ player: makePlayer("a"), position: 20 })];
    const bigAfter = [makeEntry({ player: makePlayer("a"), position: 14 })];
    expect(diffPositionMovement(bigBefore, bigAfter, "a")).toEqual(
      expect.objectContaining({ kind: "big-gain", positionsChanged: 6 }),
    );
  });

  it("flags a big drop (5+ places)", () => {
    const dropBefore = [makeEntry({ player: makePlayer("a"), position: 3 })];
    const dropAfter = [makeEntry({ player: makePlayer("a"), position: 9 })];
    expect(diffPositionMovement(dropBefore, dropAfter, "a")).toEqual(
      expect.objectContaining({ kind: "big-drop", positionsChanged: 6 }),
    );
  });

  it("ignores a player who hasn't started yet", () => {
    const notStarted = [makeEntry({ player: makePlayer("a"), position: 20, started: false })];
    const started = [makeEntry({ player: makePlayer("a"), position: 5, started: true })];
    expect(diffPositionMovement(notStarted, started, "a")).toBeUndefined();
  });
});
