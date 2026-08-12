import { describe, expect, it } from "vitest";

import { buildFingerprint, decidePublication, findLowerPriorityCandidates, isInCooldown, isRateLimited, validateFacts, type TriggerCandidate } from "@/lib/live-blog/publication-policy";
import type { TriggerCategory } from "@/lib/live-blog/significance";

/** `competition` has no default -- JS default parameters also apply when a caller passes
 * `undefined` explicitly, which would silently defeat any test that means to construct a
 * candidate with no competition set at all. Every call site states it outright instead. */
function makeCandidate(
  playerId: string | undefined,
  category: TriggerCategory,
  overrides: Partial<TriggerCandidate["significance"]>,
  competition: "main" | "stableford" | "scratch" | undefined,
): TriggerCandidate {
  return {
    category,
    championshipId: "c1",
    playerId,
    playerName: playerId,
    saveNonce: "save-1",
    significance: { category, inContention: false, ...overrides },
    post: { category, headline: "H", body: "B", championship: "c1", competition },
  };
}

describe("decidePublication", () => {
  const base = {
    enabled: true,
    significance: 80,
    minimumSignificance: 35,
    cooldownExempt: false,
    rateLimitExempt: false,
    inCooldown: false,
    rateLimited: false,
  };

  it("allows a candidate that clears every gate", () => {
    expect(decidePublication(base)).toEqual({ allow: true });
  });

  it("suppresses everything when the master switch is off, even a high-significance critical event", () => {
    expect(decidePublication({ ...base, enabled: false, cooldownExempt: true, rateLimitExempt: true, significance: 100 })).toEqual({
      allow: false,
      reason: "DISABLED",
    });
  });

  it("suppresses a candidate below the minimum significance", () => {
    expect(decidePublication({ ...base, significance: 10 })).toEqual({ allow: false, reason: "LOW_SIGNIFICANCE" });
  });

  it("suppresses a cooldown-gated candidate during cooldown", () => {
    expect(decidePublication({ ...base, inCooldown: true })).toEqual({ allow: false, reason: "COOLDOWN" });
  });

  it("suppresses a rate-limit-gated candidate once the hourly cap is hit", () => {
    expect(decidePublication({ ...base, rateLimited: true })).toEqual({ allow: false, reason: "MAX_PER_HOUR" });
  });

  it("lets a cooldown-exempt candidate bypass cooldown", () => {
    expect(decidePublication({ ...base, cooldownExempt: true, inCooldown: true })).toEqual({ allow: true });
  });

  it("lets a rate-limit-exempt candidate bypass the hourly cap", () => {
    expect(decidePublication({ ...base, rateLimitExempt: true, rateLimited: true })).toEqual({ allow: true });
  });

  it("still enforces the minimum significance for a fully-exempt critical candidate", () => {
    expect(decidePublication({ ...base, cooldownExempt: true, rateLimitExempt: true, significance: 5 })).toEqual({
      allow: false,
      reason: "LOW_SIGNIFICANCE",
    });
  });

  it("cooldown-exempt does not also exempt from the hourly cap", () => {
    expect(decidePublication({ ...base, cooldownExempt: true, inCooldown: true, rateLimited: true })).toEqual({
      allow: false,
      reason: "MAX_PER_HOUR",
    });
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

describe("findLowerPriorityCandidates", () => {
  it("keeps a single non-critical candidate for a player", () => {
    const birdie = makeCandidate("p1", "birdie", {}, "main");
    expect(findLowerPriorityCandidates([birdie])).toEqual(new Set());
  });

  it("suppresses the lower-significance one of two non-critical candidates for the same player on the same competition", () => {
    const birdie = makeCandidate("p1", "birdie", {}, "main"); // base 20
    const charge = makeCandidate("p1", "charge", { holesRemaining: 10 }, "main"); // base 65
    const result = findLowerPriorityCandidates([birdie, charge]);
    expect(result.has(birdie)).toBe(true);
    expect(result.has(charge)).toBe(false);
  });

  it("does not suppress candidates for different players", () => {
    const a = makeCandidate("p1", "birdie", {}, "main");
    const b = makeCandidate("p2", "charge", { holesRemaining: 10 }, "main");
    expect(findLowerPriorityCandidates([a, b])).toEqual(new Set());
  });

  it("does not suppress two non-critical candidates for the same player on different competitions (the 2013 replay's David Clee case: Scratch lead-extends + Main through, same save)", () => {
    const leadExtends = makeCandidate("p1", "lead-extends", {}, "scratch");
    const through = makeCandidate("p1", "through", {}, "main");
    expect(findLowerPriorityCandidates([leadExtends, through])).toEqual(new Set());
  });

  it("does not suppress a candidate with no competition set (a merged multi-competition post or a no-return announcement), even alongside another candidate for the same player", () => {
    const noReturn = makeCandidate("p1", "no-return", {}, undefined);
    const birdie = makeCandidate("p1", "birdie", {}, "main");
    expect(findLowerPriorityCandidates([noReturn, birdie])).toEqual(new Set());
  });

  it("never suppresses a critical category, regardless of a lower-significance critical candidate arriving after a higher non-critical one", () => {
    const leader = makeCandidate("p1", "leader", {}, "main"); // critical, base 95
    const charge = makeCandidate("p1", "charge", { holesRemaining: 10 }, "main"); // non-critical, base 65
    const result = findLowerPriorityCandidates([leader, charge]);
    expect(result.has(leader)).toBe(false);
    expect(result.has(charge)).toBe(false); // charge is still the sole non-critical candidate for p1, so it survives too
  });

  it("a critical candidate does not shield a lower-priority non-critical sibling from being suppressed", () => {
    const leader = makeCandidate("p1", "leader", {}, "main"); // critical
    const birdie = makeCandidate("p1", "birdie", {}, "main"); // base 20
    const charge = makeCandidate("p1", "charge", { holesRemaining: 10 }, "main"); // base 65
    const result = findLowerPriorityCandidates([leader, birdie, charge]);
    expect(result.has(leader)).toBe(false);
    expect(result.has(charge)).toBe(false);
    expect(result.has(birdie)).toBe(true);
  });

  it("never suppresses field-wide candidates (no playerId), even several at once", () => {
    const a = makeCandidate(undefined, "championship", {}, "main");
    const b = makeCandidate(undefined, "championship", {}, "main");
    expect(findLowerPriorityCandidates([a, b])).toEqual(new Set());
  });

  it("keeps the first of two exactly-tied-significance candidates", () => {
    const first = makeCandidate("p1", "birdie", {}, "main");
    const second = makeCandidate("p1", "birdie", {}, "main");
    const result = findLowerPriorityCandidates([first, second]);
    expect(result.has(first)).toBe(false);
    expect(result.has(second)).toBe(true);
  });
});
