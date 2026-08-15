import { describe, expect, it, vi } from "vitest";

import { saveScores, type ScoringPayloadClient } from "./save-logic";
import { generateLiveBlogPosts } from "@/lib/live-blog/generate";
import { computeScorecardTotals } from "@/lib/scoring";
import { createFakePayload } from "@/lib/live-blog/__fixtures__/fake-payload";
import { CHAMPIONSHIP, PLAYERS, VENUE, VENUE_HOLES, findPlayer } from "@/lib/live-blog/__fixtures__/2013-replay-fixtures";
import type { PayloadRequest } from "payload";
import type { ScoringSessionPayload } from "@/lib/scoring-session";

const HOLE_INFOS = VENUE_HOLES.map((h) => ({ par: h.par, si: h.si }));

const TEE_TIME_ROUND_ID = "ttr-1";
const GROUP_A_ID = "group-a";
const GROUP_B_ID = "group-b";
const PLAYER_A_ID = "26"; // John Pow -- Group A, the group the tests log in as.
const PLAYER_B_ID = "24"; // Bobby Ferguson -- Group B, used to prove cross-group writes are rejected.

function blankScorecard(id: string, playerId: string) {
  return {
    id,
    player: findPlayer(playerId),
    championship: CHAMPIONSHIP,
    holes: Array.from({ length: 18 }, (_, i) => ({ holeNumber: i + 1, strokes: undefined, noReturn: false })),
    holesCompleted: 0,
    grossTotal: 0,
    nettTotal: 0,
    stablefordTotal: 0,
    toParGross: 0,
    toParNett: 0,
    noReturn: false,
    updatedAt: "2026-08-13T09:00:00.000Z",
    createdAt: "2026-08-13T09:00:00.000Z",
  };
}

function seedFixture() {
  const teeTimeRound = {
    id: TEE_TIME_ROUND_ID,
    round: "Championship",
    championship: CHAMPIONSHIP,
    date: "2026-08-13",
    archived: false,
    groups: [
      { id: GROUP_A_ID, time: "09.00", tee: "1st", players: [findPlayer(PLAYER_A_ID)], pin: "AAAAA", pinVersion: 1 },
      { id: GROUP_B_ID, time: "09.08", tee: "1st", players: [findPlayer(PLAYER_B_ID)], pin: "BBBBB", pinVersion: 1 },
    ],
  };

  const scorecardA = blankScorecard("sc-a", PLAYER_A_ID);
  const scorecardB = blankScorecard("sc-b", PLAYER_B_ID);

  const payload = createFakePayload({
    championships: [CHAMPIONSHIP] as unknown as (Record<string, unknown> & { id: string })[],
    players: PLAYERS as unknown as (Record<string, unknown> & { id: string })[],
    venues: [VENUE as unknown as Record<string, unknown> & { id: string }],
    scorecards: [scorecardA, scorecardB] as unknown as (Record<string, unknown> & { id: string })[],
    "tee-time-rounds": [teeTimeRound as unknown as Record<string, unknown> & { id: string }],
    globals: {
      "live-blog-config": { enabled: true, minimumSignificance: 35, cooldownSeconds: 90, maxPostsPerHour: 100 } as unknown as Record<string, unknown> & {
        id: string;
      },
    },
  });

  const sessionA: ScoringSessionPayload = {
    teeTimeRoundId: TEE_TIME_ROUND_ID,
    groupId: GROUP_A_ID,
    championshipId: String(CHAMPIONSHIP.id),
    pinVersion: 1,
  };

  return { payload: payload as unknown as ScoringPayloadClient, rawPayload: payload, sessionA, scorecardAId: "sc-a", scorecardBId: "sc-b" };
}

describe("saveScores", () => {
  it("applies an update for a scorecard genuinely in the session's own group", async () => {
    const { payload, sessionA, scorecardAId } = seedFixture();
    const result = await saveScores(payload, sessionA, [{ scorecardId: scorecardAId, holeNumber: 1, strokes: 4 }]);
    expect(result.rejected).toEqual([]);
    expect(result.applied).toHaveLength(1);

    const updated = await payload.findByID({ collection: "scorecards", id: scorecardAId });
    expect((updated.holes as { holeNumber: number; strokes?: number; noReturn: boolean }[])[0]).toMatchObject({
      holeNumber: 1,
      strokes: 4,
      noReturn: false,
    });
  });

  it("rejects an update for a scorecard belonging to a different group", async () => {
    const { payload, sessionA, scorecardBId } = seedFixture();
    const result = await saveScores(payload, sessionA, [{ scorecardId: scorecardBId, holeNumber: 1, strokes: 4 }]);
    expect(result.applied).toEqual([]);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0].reason).toMatch(/not a scorecard in this group/);
  });

  it("rejects every update when the session's pinVersion is stale (e.g. the PIN was regenerated)", async () => {
    const { payload, sessionA, scorecardAId } = seedFixture();
    const staleSession: ScoringSessionPayload = { ...sessionA, pinVersion: 999 };
    const result = await saveScores(payload, staleSession, [{ scorecardId: scorecardAId, holeNumber: 1, strokes: 4 }]);
    expect(result.applied).toEqual([]);
    expect(result.rejected[0].reason).toMatch(/log in again/);
  });

  it("records a No Return as strokes:undefined, noReturn:true", async () => {
    const { payload, sessionA, scorecardAId } = seedFixture();
    await saveScores(payload, sessionA, [{ scorecardId: scorecardAId, holeNumber: 3, noReturn: true }]);

    const updated = await payload.findByID({ collection: "scorecards", id: scorecardAId });
    expect((updated.holes as { holeNumber: number; strokes?: number; noReturn: boolean }[])[2]).toMatchObject({
      holeNumber: 3,
      strokes: undefined,
      noReturn: true,
    });
  });

  it("never passes a suppressLiveBlog context to payload.update -- on-course saves are real-time, unlike the bulk admin-scoring tool", async () => {
    const { payload, rawPayload, sessionA, scorecardAId } = seedFixture();
    const updateSpy = vi.spyOn(rawPayload, "update");
    await saveScores(payload, sessionA, [{ scorecardId: scorecardAId, holeNumber: 1, strokes: 4 }]);

    expect(updateSpy).toHaveBeenCalled();
    for (const call of updateSpy.mock.calls) {
      expect((call[0] as { context?: unknown }).context).toBeUndefined();
    }
  });

  it("really does let a live-blog post fire for an on-course save, end to end", async () => {
    const { payload, rawPayload, sessionA, scorecardAId } = seedFixture();
    const before = await payload.findByID({ collection: "scorecards", id: scorecardAId });

    await saveScores(payload, sessionA, [{ scorecardId: scorecardAId, holeNumber: 1, strokes: HOLE_INFOS[0].par - 1 }]);

    // saveScores only merges the raw hole into holes[] -- exactly what a real beforeValidate hook
    // receives as input. fake-payload doesn't run hooks, so this reproduces what Scorecards'
    // beforeValidate would have computed on a real save, before generateLiveBlogPosts runs.
    const merged = await payload.findByID({ collection: "scorecards", id: scorecardAId });
    const strokes = (merged.holes as { strokes?: number }[]).map((h) => h.strokes ?? null);
    const noReturns = (merged.holes as { noReturn?: boolean }[]).map((h) => Boolean(h.noReturn));
    const totals = computeScorecardTotals(strokes, noReturns, HOLE_INFOS, findPlayer(PLAYER_A_ID).championshipHandicap ?? 0);

    const doc = { ...merged, ...totals, scoreUpdatedAt: "2026-08-13T09:05:00.000Z" };
    const previousDoc = { ...before, scoreUpdatedAt: undefined };

    const req = { payload: rawPayload } as unknown as PayloadRequest;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await generateLiveBlogPosts({ doc, previousDoc, req, operation: "update", context: {} } as any);

    expect(rawPayload.liveBlogPosts().length).toBeGreaterThan(0);
  });
});
