import { describe, expect, it } from "vitest";

import { evaluateAndPublish, type TriggerCandidate } from "@/lib/live-blog/publication-policy";
import { createFakePayload } from "@/lib/live-blog/__fixtures__/fake-payload";
import type { PayloadRequest } from "payload";

/**
 * Championship-day question: a scorer enters a score, it posts, and the same score is entered
 * again. Does the blog post twice?
 *
 * Re-saving identical scores never reaches this code -- Scorecards' beforeValidate only moves
 * scoreUpdatedAt when the strokes actually differ, and generateLiveBlogPosts returns early when it
 * has not moved. What DOES reach here is clearing a score and typing it back in: two real changes,
 * two stamps, so two different fingerprints, which the fingerprint's unique index cannot catch by
 * design (see "differs for a later, independent save" in publication-policy.test.ts).
 *
 * These tests drive the guard directly by seeding a trigger-log entry that already published, which
 * is the state the second save actually meets. Driving a real publish first would need a full
 * championship fixture -- 2013-replay.test.ts already covers that path end to end.
 */
function emptySeed() {
  return { championships: [], players: [], venues: [], scorecards: [], "tee-time-rounds": [] };
}

function birdieAtHole(saveNonce: string, holeNumber = 7): TriggerCandidate {
  return {
    category: "birdie",
    championshipId: "c1",
    playerId: "p1",
    playerName: "A Player",
    holeNumber,
    saveNonce,
    // criticalOverride is the dangerous combination: it bypasses the cooldown that would otherwise
    // have absorbed a quick second post.
    criticalOverride: true,
    significance: { category: "birdie", inContention: true },
    post: { category: "birdie", headline: "Birdie at the 7th", body: "B", championship: "c1", competition: "main" },
  } as TriggerCandidate;
}

function seedAlreadyPublished(payload: ReturnType<typeof createFakePayload>, holeNumber: number) {
  payload._seedWrite("live-blog-trigger-log", {
    id: "already",
    fingerprint: "c1:birdie:p1:" + holeNumber + ":save-1",
    championship: "c1",
    category: "birdie",
    player: "p1",
    holeNumber,
    selected: true,
    suppressed: false,
  });
}

function reqFor(payload: ReturnType<typeof createFakePayload>): PayloadRequest {
  return { payload } as unknown as PayloadRequest;
}

describe("the same on-course event cannot post twice", () => {
  it("refuses a second post for a player's hole that has already published, even from a later save", async () => {
    const payload = createFakePayload(emptySeed());
    seedAlreadyPublished(payload, 7);

    const result = await evaluateAndPublish(reqFor(payload), birdieAtHole("save-2"));

    expect(result.reason).toBe("DUPLICATE");
    expect(result.published).toBe(false);
    expect(payload.liveBlogPosts()).toHaveLength(0);
  });

  it("does not log the refused candidate again -- the guard runs before the trigger log is written", async () => {
    const payload = createFakePayload(emptySeed());
    seedAlreadyPublished(payload, 7);

    await evaluateAndPublish(reqFor(payload), birdieAtHole("save-2"));

    expect(payload.liveBlogTriggerLog()).toHaveLength(1);
  });

  it("leaves the same player's other holes alone", async () => {
    const payload = createFakePayload(emptySeed());
    seedAlreadyPublished(payload, 7);

    const elsewhere = await evaluateAndPublish(reqFor(payload), birdieAtHole("save-2", 12));

    // It may still be suppressed for other reasons in this bare fixture, but it must not be
    // rejected as a duplicate of the 7th.
    expect(elsewhere.reason).not.toBe("DUPLICATE");
  });

  it("leaves a different player's same hole alone", async () => {
    const payload = createFakePayload(emptySeed());
    seedAlreadyPublished(payload, 7);

    const other = { ...birdieAtHole("save-2"), playerId: "p2" } as TriggerCandidate;
    const result = await evaluateAndPublish(reqFor(payload), other);

    expect(result.reason).not.toBe("DUPLICATE");
  });
});
