import { describe, expect, it } from "vitest";
import * as commentary from "@/lib/live-blog/commentary";

/**
 * Guards against a real bug caught during the 2013 replay review: a few birdie/bogey phrasing
 * variants asserted specific shot detail ("misses the green", "a confident putt", "the putt never
 * in doubt") that the site has no data to support -- scoring is strokes-only, with no shot-by-shot
 * tracking. Every commentary function is sampled many times (to cover every `pick()` variant) and
 * scanned for words that describe HOW a shot was played rather than WHAT the scoreboard shows.
 * Score/position/margin/streak words are fine; anything implying a specific green, putt, drive,
 * approach, or lie is not, because it isn't something this data can ever actually know.
 */
const BANNED_WORDS = [
  "green",
  "putt",
  "fairway",
  "bunker",
  "rough",
  "chip",
  "pitch",
  "drive",
  "tee shot",
  "approach shot",
  "iron",
  "wedge",
  "confident",
  "nervy",
  "never in doubt",
  "front of the cup",
  "lip",
  "rolls in",
  "shot of the day",
  "nerves",
  "clean sweep",
  "great streaks",
];

// Genuine exceptions, reviewed by hand: "First balls down the fairway" is generic scene-setting
// for "play has begun" (a standard idiom, not a claim about any specific player's shot), the only
// occasion this list should ever grow -- every other flagged word is a real fix, not a false positive.
const EXEMPT_PATTERNS: Record<string, RegExp[]> = {
  competitionUnderwayCommentary: [/down the fairway/i],
};

const SAMPLES: [string, (...args: never[]) => commentary.Commentary][] = [
  ["albatrossCommentary", commentary.albatrossCommentary as never],
  ["eagleCommentary", commentary.eagleCommentary as never],
  ["birdieCommentary", commentary.birdieCommentary as never],
  ["nettEagleCommentary", commentary.nettEagleCommentary as never],
  ["bogeyCommentary", commentary.bogeyCommentary as never],
  ["doubleBogeyCommentary", commentary.doubleBogeyCommentary as never],
  ["leaderCommentary", commentary.leaderCommentary as never],
  ["leaderCommentaryMulti", commentary.leaderCommentaryMulti as never],
  ["competitionUnderwayCommentary", commentary.competitionUnderwayCommentary as never],
  ["roundCompleteCommentary", commentary.roundCompleteCommentary as never],
  ["lastGroupOutCommentary", commentary.lastGroupOutCommentary as never],
  ["movingUpCommentary", commentary.movingUpCommentary as never],
  ["chargeCommentary", commentary.chargeCommentary as never],
  ["hotStreakCommentary", commentary.hotStreakCommentary as never],
  ["birdieRunCommentary", commentary.birdieRunCommentary as never],
  ["movingDownCommentary", commentary.movingDownCommentary as never],
  ["troubleCommentary", commentary.troubleCommentary as never],
  ["leaderFaltersCommentary", commentary.leaderFaltersCommentary as never],
  ["challengeFaltersCommentary", commentary.challengeFaltersCommentary as never],
  ["noReturnCommentary", commentary.noReturnCommentary as never],
  ["defendingChampionUnderwayCommentary", commentary.defendingChampionUnderwayCommentary as never],
  ["turnReportCommentary", commentary.turnReportCommentary as never],
  ["playoffCommentary", commentary.playoffCommentary as never],
  ["throughCommentary", commentary.throughCommentary as never],
  ["tieCommentary", commentary.tieCommentary as never],
  ["tieCommentaryMulti", commentary.tieCommentaryMulti as never],
  ["leadExtendsCommentary", commentary.leadExtendsCommentary as never],
  ["leadExtendsCommentaryMulti", commentary.leadExtendsCommentaryMulti as never],
  ["enteringContentionCommentary", commentary.enteringContentionCommentary as never],
  ["enteringContentionCommentaryMulti", commentary.enteringContentionCommentaryMulti as never],
  ["leavingContentionCommentary", commentary.leavingContentionCommentary as never],
  ["leavingContentionCommentaryMulti", commentary.leavingContentionCommentaryMulti as never],
  ["aceCommentary", commentary.aceCommentary as never],
  ["enterTopCommentary", commentary.enterTopCommentary as never],
  ["bigGainCommentary", commentary.bigGainCommentary as never],
  ["bigDropCommentary", commentary.bigDropCommentary as never],
  ["pressureMomentCommentary", commentary.pressureMomentCommentary as never],
  ["winnerConfirmedCommentary", commentary.winnerConfirmedCommentary as never],
  ["clubhouseLeaderCommentary", commentary.clubhouseLeaderCommentary as never],
  ["clubhouseShareCommentary", commentary.clubhouseShareCommentary as never],
  ["bestGrossRoundCommentary", commentary.bestGrossRoundCommentary as never],
  ["courseRecordPaceCommentary", commentary.courseRecordPaceCommentary as never],
  ["courseRecordCommentary", commentary.courseRecordCommentary as never],
  ["recordLeadCommentary", commentary.recordLeadCommentary as never],
  ["recordMarginCommentary", commentary.recordMarginCommentary as never],
  ["recordLowScoreCommentary", commentary.recordLowScoreCommentary as never],
];

// Args tailored to each function's real signature -- values chosen to exercise every branch
// (e.g. doubleBogeyCommentary's relativeToPar, bigDropCommentary/enterTopCommentary/bigGainCommentary
// both with and without their optional cause label).
const SAMPLE_ARGS: Record<string, unknown[][]> = {
  albatrossCommentary: [
    ["Test Player", 5],
    ["Test Player", 5, true],
  ],
  eagleCommentary: [
    ["Test Player", 5],
    ["Test Player", 5, true],
  ],
  birdieCommentary: [["Test Player", 5]],
  nettEagleCommentary: [["Test Player", 5]],
  bogeyCommentary: [["Test Player", 5]],
  doubleBogeyCommentary: [
    ["Test Player", 5, 2],
    ["Test Player", 5, 3],
  ],
  leaderCommentary: [["Test Player", "-2", "Main", "5"]],
  leaderCommentaryMulti: [["Test Player", ["Main", "Scratch"], ["-2", "+1"], "5"]],
  competitionUnderwayCommentary: [[2026, "Test Venue"]],
  roundCompleteCommentary: [["Test Player", -2, 3, false]],
  lastGroupOutCommentary: [["Test Venue"]],
  movingUpCommentary: [["Test Player"]],
  chargeCommentary: [["Test Player", 3]],
  hotStreakCommentary: [["Test Player", 4]],
  birdieRunCommentary: [["Test Player", 3, 4]],
  movingDownCommentary: [["Test Player"]],
  troubleCommentary: [["Test Player", 3]],
  leaderFaltersCommentary: [["Test Player", 2]],
  challengeFaltersCommentary: [["Test Player", 2]],
  noReturnCommentary: [["Test Player", 5]],
  defendingChampionUnderwayCommentary: [["Test Player", 1]],
  turnReportCommentary: [
    [["Test Player"], -2, 3.5, []],
    [["Test Player", "Other Player"], -2, 3.5, ["Third Player", "Fourth Player"]],
  ],
  playoffCommentary: [[["Player A", "Player B"], "Main", "-2"]],
  throughCommentary: [
    ["Test Player", 10, -2, 0, false],
    ["Test Player", 10, -2, 1, false],
  ],
  tieCommentary: [["Test Player", "-2", "Main", "5", ["Other Player"]]],
  tieCommentaryMulti: [["Test Player", ["Main", "Scratch"], ["-2", "+1"], "5"]],
  leadExtendsCommentary: [["Test Player", 2, "Main", "5"]],
  leadExtendsCommentaryMulti: [["Test Player", ["Main", "Scratch"], [2, 1], "5"]],
  enteringContentionCommentary: [["Test Player", "Main", 2, "shot", "5"]],
  enteringContentionCommentaryMulti: [["Test Player", ["Main", "Scratch"], [2, 1], ["shot", "shot"], "5"]],
  leavingContentionCommentary: [["Test Player", "Main", 2, "shot", "5"]],
  leavingContentionCommentaryMulti: [["Test Player", ["Main", "Scratch"], [2, 1], ["shot", "shot"], "5"]],
  aceCommentary: [["Test Player", 5]],
  enterTopCommentary: [
    ["Test Player", 5, 5],
    ["Test Player", 5, 5, "birdie", 5],
    ["Test Player", 5, 5, "nett eagle", 5],
  ],
  bigGainCommentary: [
    ["Test Player", 6, 8],
    ["Test Player", 6, 8, "birdie", 5],
  ],
  bigDropCommentary: [
    ["Test Player", 2, 8],
    ["Test Player", 2, 8, "double bogey", 5],
  ],
  pressureMomentCommentary: [
    ["Test Player", 0, "shot", "Main"],
    ["Test Player", 2, "shot", "Main"],
  ],
  winnerConfirmedCommentary: [
    ["Test Player", "Main", "-2"],
    ["Test Player", "Main", "-2", "Beat Runner Up in the playoff, -2 to E."],
  ],
  clubhouseLeaderCommentary: [["Test Player", -2], ["Test Player", -2, true]],
  clubhouseShareCommentary: [
    ["Test Player", -2, ["Other Player"]],
    ["Test Player", 4, ["Other Player", "Third Player"], true],
  ],
  bestGrossRoundCommentary: [["Test Player", 5], ["Test Player", 5, true]],
  courseRecordPaceCommentary: [["Test Player", "Test Venue", 12, 65, "Prior Holder", 2019]],
  courseRecordCommentary: [
    ["Test Player", "Test Venue", 64, -8, "Prior Holder", 2019, false],
    ["Test Player", "Test Venue", 65, -7, "Prior Holder", 2019, true],
  ],
  recordLeadCommentary: [
    ["Test Player", 6, "Prior Holder", 2019],
    ["Test Player", 1, "Prior Holder", 2019],
  ],
  recordMarginCommentary: [
    ["Test Player", 5, "Prior Holder", 2019],
    ["Test Player", 1, "Prior Holder", 2019],
  ],
  recordLowScoreCommentary: [["Test Player", -8, "Prior Holder", 2019]],
};

describe("commentary copy never asserts invented shot detail", () => {
  for (const [name, fn] of SAMPLES) {
    const argSets = SAMPLE_ARGS[name];
    it(`${name} never uses a banned shot-detail word across every phrasing variant`, () => {
      expect(argSets, `no sample args registered for ${name}`).toBeDefined();
      const seen = new Set<string>();
      for (const args of argSets) {
        // 200 draws is comfortably enough to hit every pick() branch for the small arrays used throughout commentary.ts.
        for (let i = 0; i < 200; i++) {
          const { headline, body } = fn(...(args as never[]));
          seen.add(headline);
          seen.add(body);
        }
      }
      const exemptPatterns = EXEMPT_PATTERNS[name] ?? [];
      for (const text of seen) {
        if (exemptPatterns.some((p) => p.test(text))) continue;
        const lower = text.toLowerCase();
        for (const banned of BANNED_WORDS) {
          const pattern = new RegExp(`\\b${banned}\\b`, "i");
          expect(pattern.test(lower), `${name} produced "${text}", which contains the banned word "${banned}"`).toBe(false);
        }
      }
    });
  }
});

describe("the first card into the clubhouse", () => {
  it("never says the player took over from anyone", () => {
    for (let i = 0; i < 20; i++) {
      const nett = commentary.clubhouseLeaderCommentary("David Clee", 17, true).body;
      const gross = commentary.bestGrossRoundCommentary("David Clee", 32, true).body;
      expect(nett).toBe("David Clee is first into the clubhouse, on +17 — the target for those still out on the course.");
      expect(gross).toBe("David Clee is first in with a gross round, +32 — the Scratch target.");
    }
  });
});

describe("movement posts and shared places", () => {
  it("says tied when the place is shared, and not when it is held alone", () => {
    for (let i = 0; i < 20; i++) {
      expect(commentary.enterTopCommentary("Colin Hart", 5, 1, "birdie", 3, true).body).toMatch(/tied 1st/);
      expect(commentary.enterTopCommentary("Colin Hart", 5, 1, "birdie", 3, false).body).not.toMatch(/tied/);
      expect(commentary.bigGainCommentary("David Clee", 6, 21, "birdie", 4, true).body).toMatch(/to tied 21st/);
      expect(commentary.bigDropCommentary("Andrew Duncan", 1, 32, "double bogey", 2, true, false).body).toMatch(/from tied 1st to 32nd/);
    }
  });
});
