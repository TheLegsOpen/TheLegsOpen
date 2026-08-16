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
