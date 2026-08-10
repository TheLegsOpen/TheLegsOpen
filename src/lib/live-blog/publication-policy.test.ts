import { describe, expect, it } from "vitest";

import { buildFingerprint, decidePublication, isInCooldown, isRateLimited, validateFacts } from "@/lib/live-blog/publication-policy";

describe("decidePublication", () => {
  const base = { enabled: true, significance: 80, minimumSignificance: 35, critical: false, inCooldown: false, rateLimited: false };

  it("allows a candidate that clears every gate", () => {
    expect(decidePublication(base)).toEqual({ allow: true });
  });

  it("suppresses everything when the master switch is off, even a high-significance critical event", () => {
    expect(decidePublication({ ...base, enabled: false, critical: true, significance: 100 })).toEqual({ allow: false, reason: "DISABLED" });
  });

  it("suppresses a candidate below the minimum significance", () => {
    expect(decidePublication({ ...base, significance: 10 })).toEqual({ allow: false, reason: "LOW_SIGNIFICANCE" });
  });

  it("suppresses a non-critical candidate during cooldown", () => {
    expect(decidePublication({ ...base, inCooldown: true })).toEqual({ allow: false, reason: "COOLDOWN" });
  });

  it("suppresses a non-critical candidate once the hourly cap is hit", () => {
    expect(decidePublication({ ...base, rateLimited: true })).toEqual({ allow: false, reason: "MAX_PER_HOUR" });
  });

  it("lets a critical candidate bypass cooldown", () => {
    expect(decidePublication({ ...base, critical: true, inCooldown: true })).toEqual({ allow: true });
  });

  it("lets a critical candidate bypass the hourly cap", () => {
    expect(decidePublication({ ...base, critical: true, rateLimited: true })).toEqual({ allow: true });
  });

  it("still enforces the minimum significance for a critical candidate", () => {
    expect(decidePublication({ ...base, critical: true, significance: 5 })).toEqual({ allow: false, reason: "LOW_SIGNIFICANCE" });
  });
});

describe("isInCooldown", () => {
  it("is never in cooldown if nothing has published yet", () => {
    expect(isInCooldown(undefined, new Date(), 90)).toBe(false);
  });

  it("is in cooldown immediately after a publish", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    const last = new Date("2026-01-01T11:59:30Z"); // 30s ago
    expect(isInCooldown(last, now, 90)).toBe(true);
  });

  it("clears once the cooldown window has elapsed", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    const last = new Date("2026-01-01T11:58:00Z"); // 120s ago
    expect(isInCooldown(last, now, 90)).toBe(false);
  });
});

describe("isRateLimited", () => {
  it("is not limited below the cap", () => {
    expect(isRateLimited(5, 8)).toBe(false);
  });

  it("is limited once the cap is reached", () => {
    expect(isRateLimited(8, 8)).toBe(true);
  });
});

describe("buildFingerprint — deduplication", () => {
  it("is identical for two retries of the exact same candidate (same saveNonce)", () => {
    const a = buildFingerprint({ championshipId: "c1", category: "birdie", playerId: "p1", holeNumber: 5, saveNonce: "2026-01-01T12:00:00Z:hole-5" });
    const b = buildFingerprint({ championshipId: "c1", category: "birdie", playerId: "p1", holeNumber: 5, saveNonce: "2026-01-01T12:00:00Z:hole-5" });
    expect(a).toBe(b);
  });

  it("differs for a later, independent save even with the same category/player", () => {
    const a = buildFingerprint({ championshipId: "c1", category: "entering-contention", playerId: "p1", saveNonce: "save-1" });
    const b = buildFingerprint({ championshipId: "c1", category: "entering-contention", playerId: "p1", saveNonce: "save-2" });
    expect(a).not.toBe(b);
  });

  it("differs across different players, holes and categories", () => {
    const base = { championshipId: "c1", category: "birdie", playerId: "p1", holeNumber: 5, saveNonce: "s" };
    expect(buildFingerprint(base)).not.toBe(buildFingerprint({ ...base, playerId: "p2" }));
    expect(buildFingerprint(base)).not.toBe(buildFingerprint({ ...base, holeNumber: 6 }));
    expect(buildFingerprint(base)).not.toBe(buildFingerprint({ ...base, category: "bogey" }));
  });
});

describe("validateFacts", () => {
  it("passes copy that mentions the player and hole", () => {
    expect(validateFacts({ headline: "Birdie", body: "Bobby Ferguson rolls in a birdie at the 15th.", playerName: "Bobby Ferguson", holeNumber: 15 })).toEqual({ valid: true });
  });

  it("fails copy that never mentions the stated player", () => {
    const result = validateFacts({ headline: "Birdie", body: "A great putt drops at the 15th.", playerName: "Bobby Ferguson", holeNumber: 15 });
    expect(result.valid).toBe(false);
  });

  it("fails copy that never mentions the stated hole number", () => {
    const result = validateFacts({ headline: "Birdie", body: "Bobby Ferguson rolls in a birdie.", playerName: "Bobby Ferguson", holeNumber: 15 });
    expect(result.valid).toBe(false);
  });

  it("passes copy with no player/hole to check (e.g. a scene-setting post)", () => {
    expect(validateFacts({ headline: "Under way", body: "The 2026 Legs Open is under way." })).toEqual({ valid: true });
  });
});
