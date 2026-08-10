import { describe, expect, it } from "vitest";

import { computeSignificance, isCriticalCategory, bypassesCooldown, citesHoleNumber } from "@/lib/live-blog/significance";

describe("computeSignificance — routine event suppression", () => {
  it("scores a bogey for a player outside contention very low", () => {
    const score = computeSignificance({ category: "bogey", inContention: false });
    expect(score).toBeLessThan(20);
  });

  it("scores a birdie for a player outside contention low", () => {
    const score = computeSignificance({ category: "birdie", inContention: false });
    expect(score).toBeLessThan(30);
  });

  it("scores an in-contention bogey higher than an out-of-contention bogey", () => {
    const inContention = computeSignificance({ category: "bogey", inContention: true });
    const outOfContention = computeSignificance({ category: "bogey", inContention: false });
    expect(inContention).toBeGreaterThan(outOfContention);
  });
});

describe("computeSignificance — always-notable events", () => {
  it("scores an ace at (or near) the maximum regardless of contention", () => {
    expect(computeSignificance({ category: "ace", inContention: false })).toBeGreaterThanOrEqual(90);
  });

  it("scores an eagle highly regardless of contention", () => {
    expect(computeSignificance({ category: "eagle", inContention: false })).toBeGreaterThanOrEqual(70);
  });

  it("scores winner-confirmed at the maximum", () => {
    expect(computeSignificance({ category: "winner-confirmed", inContention: true })).toBe(100);
  });

  it("scores a new leader (lead change) very highly", () => {
    expect(computeSignificance({ category: "leader", inContention: true })).toBeGreaterThanOrEqual(90);
  });
});

describe("computeSignificance — closing-hole intelligence", () => {
  it("boosts significance for the same category as holes remaining decreases", () => {
    const early = computeSignificance({ category: "birdie", inContention: true, holesRemaining: 15 });
    const late = computeSignificance({ category: "birdie", inContention: true, holesRemaining: 2 });
    expect(late).toBeGreaterThan(early);
  });

  it("caps significance at 100 even with every bonus stacked", () => {
    const score = computeSignificance({
      category: "leader",
      inContention: true,
      holesRemaining: 1,
      positionsChanged: 20,
      movementKind: "enter-top-5",
    });
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe("computeSignificance — movement kind distinctions", () => {
  it("ranks entering the top 5 above entering the top 10", () => {
    const top5 = computeSignificance({ category: "moving-up", inContention: true, movementKind: "enter-top-5" });
    const top10 = computeSignificance({ category: "moving-up", inContention: true, movementKind: "enter-top-10" });
    expect(top5).toBeGreaterThan(top10);
  });

  it("gives a larger position swing more significance than a small one", () => {
    const small = computeSignificance({ category: "moving-up", inContention: true, movementKind: "big-gain", positionsChanged: 6 });
    const large = computeSignificance({ category: "moving-up", inContention: true, movementKind: "big-gain", positionsChanged: 15 });
    expect(large).toBeGreaterThan(small);
  });
});

describe("computeSignificance — round-complete", () => {
  it("gives a top-3 finish more significance than a mid-table finish", () => {
    const top3 = computeSignificance({ category: "round-complete", inContention: true, finishPosition: 2 });
    const midTable = computeSignificance({ category: "round-complete", inContention: true, finishPosition: 22 });
    expect(top3).toBeGreaterThan(midTable);
  });
});

describe("isCriticalCategory", () => {
  it("treats lead changes, ties, winner confirmation, pressure moments and aces as critical (bypass cooldown AND the hourly cap)", () => {
    expect(isCriticalCategory("leader")).toBe(true);
    expect(isCriticalCategory("tie")).toBe(true);
    expect(isCriticalCategory("winner-confirmed")).toBe(true);
    expect(isCriticalCategory("pressure-moment")).toBe(true);
    expect(isCriticalCategory("ace")).toBe(true);
  });

  it("does not treat a routine bogey as critical", () => {
    expect(isCriticalCategory("bogey")).toBe(false);
  });
});

describe("bypassesCooldown", () => {
  it("cooldown-gates birdie and bogey -- the only categories that can genuinely recur many times in one round", () => {
    expect(bypassesCooldown("birdie")).toBe(false);
    expect(bypassesCooldown("bogey")).toBe(false);
  });

  it("exempts one-off state-change categories from cooldown, even though they aren't critical (still rate-limited)", () => {
    expect(bypassesCooldown("entering-contention")).toBe(true);
    expect(bypassesCooldown("leaving-contention")).toBe(true);
    expect(bypassesCooldown("moving-up")).toBe(true);
    expect(bypassesCooldown("moving-down")).toBe(true);
    expect(bypassesCooldown("trouble")).toBe(true);
    expect(bypassesCooldown("charge")).toBe(true);
    expect(bypassesCooldown("eagle")).toBe(true);
  });

  it("exempts every critical category too", () => {
    expect(bypassesCooldown("leader")).toBe(true);
    expect(bypassesCooldown("tie")).toBe(true);
    expect(bypassesCooldown("ace")).toBe(true);
  });
});

describe("citesHoleNumber", () => {
  it("is true for the four categories whose commentary templates name a specific hole", () => {
    expect(citesHoleNumber("ace")).toBe(true);
    expect(citesHoleNumber("eagle")).toBe(true);
    expect(citesHoleNumber("birdie")).toBe(true);
    expect(citesHoleNumber("bogey")).toBe(true);
  });

  it("is false for streak/momentum categories, whose copy describes a run across holes rather than naming one", () => {
    expect(citesHoleNumber("moving-up")).toBe(false);
    expect(citesHoleNumber("moving-down")).toBe(false);
    expect(citesHoleNumber("charge")).toBe(false);
    expect(citesHoleNumber("trouble")).toBe(false);
  });

  it("is false for categories that never carry a holeNumber at all", () => {
    expect(citesHoleNumber("leader")).toBe(false);
    expect(citesHoleNumber("round-complete")).toBe(false);
  });
});
