import { beforeAll, describe, expect, it } from "vitest";

import { generatePin, issueScoringSession, verifyScoringSession, type ScoringSessionPayload } from "@/lib/scoring-session";

// vitest doesn't load .env the way `next dev` does -- these tests only need *some* stable secret
// to sign/verify against, not the real production value.
beforeAll(() => {
  process.env.PAYLOAD_SECRET ??= "test-secret-for-scoring-session-tests";
});

const SAMPLE_PAYLOAD: ScoringSessionPayload = {
  teeTimeRoundId: "42",
  groupId: "group-1",
  championshipId: "15",
  pinVersion: 1,
};

describe("generatePin", () => {
  it("is always 5 characters", () => {
    for (let i = 0; i < 200; i++) expect(generatePin()).toHaveLength(5);
  });

  it("never uses easily-confused characters (0/O/1/I)", () => {
    for (let i = 0; i < 200; i++) {
      const pin = generatePin();
      expect(pin).not.toMatch(/[0O1I]/);
    }
  });

  it("produces real variety, not a fixed value", () => {
    const seen = new Set(Array.from({ length: 100 }, () => generatePin()));
    expect(seen.size).toBeGreaterThan(50);
  });
});

describe("issueScoringSession / verifyScoringSession", () => {
  it("round-trips the exact payload it was issued with", async () => {
    const token = await issueScoringSession(SAMPLE_PAYLOAD, new Date(Date.now() + 60_000));
    const verified = await verifyScoringSession(token);
    expect(verified).toEqual(SAMPLE_PAYLOAD);
  });

  it("returns null for an expired token", async () => {
    const token = await issueScoringSession(SAMPLE_PAYLOAD, new Date(Date.now() - 1000));
    expect(await verifyScoringSession(token)).toBeNull();
  });

  it("returns null for a tampered token", async () => {
    const token = await issueScoringSession(SAMPLE_PAYLOAD, new Date(Date.now() + 60_000));
    const tampered = token.slice(0, -4) + (token.slice(-4) === "abcd" ? "efgh" : "abcd");
    expect(await verifyScoringSession(tampered)).toBeNull();
  });

  it("returns null for garbage input", async () => {
    expect(await verifyScoringSession("not-a-real-token")).toBeNull();
  });

  it("returns null for a missing token", async () => {
    expect(await verifyScoringSession(undefined)).toBeNull();
    expect(await verifyScoringSession(null)).toBeNull();
  });
});
