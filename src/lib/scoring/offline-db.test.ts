import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";

import { _resetForTests, cacheGroup, getCachedGroup, getAllHoles, getUnsyncedHoles, markHolesSynced, queueHoleUpdate } from "./offline-db";

beforeEach(async () => {
  await _resetForTests();
});

describe("queueHoleUpdate / getUnsyncedHoles", () => {
  it("queues a hole update as unsynced", async () => {
    await queueHoleUpdate({ scorecardId: "sc-1", holeNumber: 1, strokes: 4, noReturn: false });
    const unsynced = await getUnsyncedHoles();
    expect(unsynced).toHaveLength(1);
    expect(unsynced[0]).toMatchObject({ scorecardId: "sc-1", holeNumber: 1, strokes: 4, noReturn: false, synced: false });
  });

  it("overwrites the same scorecard+hole rather than duplicating it", async () => {
    await queueHoleUpdate({ scorecardId: "sc-1", holeNumber: 1, strokes: 4, noReturn: false });
    await queueHoleUpdate({ scorecardId: "sc-1", holeNumber: 1, strokes: 5, noReturn: false });
    const all = await getAllHoles();
    expect(all).toHaveLength(1);
    expect(all[0].strokes).toBe(5);
  });

  it("records a No Return as strokes:undefined, noReturn:true", async () => {
    await queueHoleUpdate({ scorecardId: "sc-1", holeNumber: 3, noReturn: true });
    const unsynced = await getUnsyncedHoles();
    // IndexedDB's structured clone drops undefined-valued keys entirely rather than storing them
    // as undefined -- .strokes reads as undefined either way, which is all callers ever check.
    expect(unsynced[0].strokes).toBeUndefined();
    expect(unsynced[0].noReturn).toBe(true);
  });

  it("is a no-op when re-queued with identical values after already syncing", async () => {
    // Regression: a duplicated "Save & Next Hole" call (double-tap, a re-mount picking the hole
    // back up, a retry after patchy signal) was re-marking an already-synced hole as unsynced
    // with unchanged values, causing it to be re-sent to the server -- which re-fired
    // Scorecards' afterChange hook (live-blog generation included) as if it were a new score,
    // producing a duplicate live-blog post for the same real event.
    await queueHoleUpdate({ scorecardId: "sc-1", holeNumber: 1, strokes: 4, noReturn: false });
    await markHolesSynced(["sc-1:1"]);

    await queueHoleUpdate({ scorecardId: "sc-1", holeNumber: 1, strokes: 4, noReturn: false });

    expect(await getUnsyncedHoles()).toHaveLength(0);
    const all = await getAllHoles();
    expect(all).toHaveLength(1);
    expect(all[0].synced).toBe(true);
  });

  it("does re-flag as unsynced when a genuinely new value follows a synced one", async () => {
    await queueHoleUpdate({ scorecardId: "sc-1", holeNumber: 1, strokes: 4, noReturn: false });
    await markHolesSynced(["sc-1:1"]);

    await queueHoleUpdate({ scorecardId: "sc-1", holeNumber: 1, strokes: 5, noReturn: false });

    const unsynced = await getUnsyncedHoles();
    expect(unsynced).toHaveLength(1);
    expect(unsynced[0].strokes).toBe(5);
  });

  it("tracks multiple players/holes independently", async () => {
    await queueHoleUpdate({ scorecardId: "sc-1", holeNumber: 1, strokes: 4, noReturn: false });
    await queueHoleUpdate({ scorecardId: "sc-2", holeNumber: 1, strokes: 5, noReturn: false });
    await queueHoleUpdate({ scorecardId: "sc-1", holeNumber: 2, strokes: 3, noReturn: false });
    expect(await getUnsyncedHoles()).toHaveLength(3);
  });
});

describe("markHolesSynced", () => {
  it("removes only the marked entries from the unsynced list", async () => {
    await queueHoleUpdate({ scorecardId: "sc-1", holeNumber: 1, strokes: 4, noReturn: false });
    await queueHoleUpdate({ scorecardId: "sc-1", holeNumber: 2, strokes: 3, noReturn: false });

    await markHolesSynced(["sc-1:1"]);

    const unsynced = await getUnsyncedHoles();
    expect(unsynced).toHaveLength(1);
    expect(unsynced[0].holeNumber).toBe(2);

    // The synced entry is still there (for audit/debugging), just no longer "unsynced".
    const all = await getAllHoles();
    expect(all).toHaveLength(2);
    expect(all.find((h) => h.holeNumber === 1)?.synced).toBe(true);
  });

  it("is a no-op for keys that don't exist", async () => {
    await expect(markHolesSynced(["does-not-exist:1"])).resolves.not.toThrow();
  });
});

describe("cacheGroup / getCachedGroup", () => {
  it("round-trips a group snapshot", async () => {
    const group = { groupLabel: "09.00 · 1st tee", players: [{ playerId: "1", playerName: "Test Player" }] };
    await cacheGroup(group);
    expect(await getCachedGroup()).toEqual(group);
  });

  it("returns undefined when nothing has been cached yet", async () => {
    expect(await getCachedGroup()).toBeUndefined();
  });
});
