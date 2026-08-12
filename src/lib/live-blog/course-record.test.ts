import { describe, expect, it, vi } from "vitest";
import { generateLiveBlogPosts } from "@/lib/live-blog/generate";
import { computeScorecardTotals } from "@/lib/scoring";
import { createFakePayload } from "@/lib/live-blog/__fixtures__/fake-payload";
import { CHAMPIONSHIP, PLAYERS, VENUE, VENUE_HOLES, TEE_TIME_ROUND, findPlayer } from "@/lib/live-blog/__fixtures__/2013-replay-fixtures";
import type { PayloadRequest } from "payload";
import type { Scorecard, Championship } from "@/payload-types";

const HOLE_INFOS = VENUE_HOLES.map((h) => ({ par: h.par, si: h.si }));
const PARS = VENUE_HOLES.map((h) => h.par);
const HOLDER_ID = "31"; // Robert Hamilton -- holds the seeded prior-championship record round.
const LIVE_PLAYER_ID = "30"; // Scott Ingram -- plays the "current" round each test drives live.

/** A prior championship at the SAME venue, one year earlier -- getCourseRecord only ever compares
 * against a genuinely separate, complete historical event, never the current one (see the comment
 * on getCourseRecord for why: comparing within the same day produced meaningless noise). */
const PRIOR_YEAR = 2012;
const PRIOR_CHAMPIONSHIP: Championship = { ...CHAMPIONSHIP, id: "champ-2012", year: PRIOR_YEAR } as Championship;

/** Every hole played exactly at par -- gross total equals the course's total par (69 here), a
 * clean, easy-to-reason-about baseline "record" to compare live rounds against. */
const PRIOR_RECORD_STROKES = PARS.slice();
const PRIOR_RECORD_GROSS_TOTAL = PRIOR_RECORD_STROKES.reduce((sum, p) => sum + p, 0);

function seedPriorRecordScorecard() {
  const holes = PRIOR_RECORD_STROKES.map((strokes, i) => ({ holeNumber: i + 1, strokes, noReturn: false }));
  const totals = computeScorecardTotals(
    holes.map((h) => h.strokes),
    holes.map((h) => h.noReturn),
    HOLE_INFOS,
    findPlayer(HOLDER_ID).championshipHandicap ?? 0,
  );
  return {
    id: "sc-2012-holder",
    player: findPlayer(HOLDER_ID),
    championship: PRIOR_CHAMPIONSHIP,
    holes,
    holesCompleted: totals.holesCompleted,
    grossTotal: totals.grossTotal,
    nettTotal: totals.nettTotal,
    stablefordTotal: totals.stablefordTotal,
    toParGross: totals.toParGross,
    toParNett: totals.toParNett,
    noReturn: totals.noReturn,
    updatedAt: "2025-01-01T00:00:00.000Z",
    createdAt: "2025-01-01T00:00:00.000Z",
  } as unknown as Scorecard;
}

function blankLiveScorecard(): Scorecard {
  return {
    id: "sc-live",
    player: findPlayer(LIVE_PLAYER_ID),
    championship: CHAMPIONSHIP,
    holes: Array.from({ length: 18 }, (_, i) => ({ holeNumber: i + 1, strokes: undefined, noReturn: false })),
    holesCompleted: 0,
    grossTotal: 0,
    nettTotal: 0,
    stablefordTotal: 0,
    toParGross: 0,
    toParNett: 0,
    noReturn: false,
    updatedAt: "2026-08-12T09:00:00.000Z",
    createdAt: "2026-08-12T09:00:00.000Z",
  } as unknown as Scorecard;
}

/** Plays the live scorecard from `beforeHoles` strokes (already-completed holes) to `afterHoles`
 * strokes (this save's new state), firing generateLiveBlogPosts exactly once for the transition --
 * mirrors how one real Scorecards save works, whether it's one hole or several at once. */
async function playTransition(beforeHoles: (number | undefined)[], afterHoles: (number | undefined)[]) {
  const priorRecord = seedPriorRecordScorecard();
  const before = blankLiveScorecard();
  const beforeTotals = computeScorecardTotals(beforeHoles, beforeHoles.map(() => false), HOLE_INFOS, findPlayer(LIVE_PLAYER_ID).championshipHandicap ?? 0);
  const previousDoc: Scorecard = {
    ...before,
    holes: beforeHoles.map((strokes, i) => ({ holeNumber: i + 1, strokes, noReturn: false })),
    ...beforeTotals,
  };

  const afterTotals = computeScorecardTotals(afterHoles, afterHoles.map(() => false), HOLE_INFOS, findPlayer(LIVE_PLAYER_ID).championshipHandicap ?? 0);
  const doc: Scorecard = {
    ...previousDoc,
    holes: afterHoles.map((strokes, i) => ({ holeNumber: i + 1, strokes, noReturn: false })),
    ...afterTotals,
    scoreUpdatedAt: "2026-08-12T09:00:00.000Z",
    updatedAt: "2026-08-12T09:00:00.000Z",
  };

  const payload = createFakePayload({
    championships: [CHAMPIONSHIP, PRIOR_CHAMPIONSHIP] as unknown as (Record<string, unknown> & { id: string })[],
    players: PLAYERS as unknown as (Record<string, unknown> & { id: string })[],
    venues: [VENUE as unknown as Record<string, unknown> & { id: string }],
    scorecards: [priorRecord, doc] as unknown as (Record<string, unknown> & { id: string })[],
    "tee-time-rounds": [TEE_TIME_ROUND as unknown as Record<string, unknown> & { id: string }],
    globals: {
      "live-blog-config": { enabled: true, minimumSignificance: 35, cooldownSeconds: 90, maxPostsPerHour: 100 } as unknown as Record<string, unknown> & {
        id: string;
      },
    },
  });
  const req = { payload } as unknown as PayloadRequest;

  await generateLiveBlogPosts({ doc, previousDoc, req, operation: "update", context: {} } as unknown as Parameters<typeof generateLiveBlogPosts>[0]);

  return payload.liveBlogPosts() as unknown as { category: string; headline: string; body: string }[];
}

describe("course record (comparing a live round against a genuinely prior championship)", () => {
  it("fires course-record when the finishing round beats the prior-championship mark", async () => {
    vi.useFakeTimers();
    try {
      const before: (number | undefined)[] = [...PARS.slice(0, 17), undefined];
      // Hole 18 one under par -- finishes one shot inside the 2012 mark.
      const after = PARS.slice(0, 17).concat([PARS[17] - 1]);
      const posts = await playTransition(before, after);
      const recordPosts = posts.filter((p) => p.category === "course-record");
      expect(recordPosts.length).toBe(1);
      expect(recordPosts[0].body).toContain(String(PRIOR_RECORD_GROSS_TOTAL - 1));
      expect(recordPosts[0].body).toContain(String(PRIOR_YEAR));
      expect(recordPosts[0].body).toContain(findPlayer(HOLDER_ID).name);
    } finally {
      vi.useRealTimers();
    }
  });

  it("fires course-record worded as equalling, not breaking, when the finishing round exactly matches the prior mark", async () => {
    vi.useFakeTimers();
    try {
      const before: (number | undefined)[] = [...PARS.slice(0, 17), undefined];
      const after = PARS.slice(); // level par every hole, same as the 2012 round
      const posts = await playTransition(before, after);
      const recordPosts = posts.filter((p) => p.category === "course-record");
      expect(recordPosts.length).toBe(1);
      expect(recordPosts[0].body).toMatch(/matches|equals|level with/i);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not fire course-record when the finishing round is worse than the prior mark", async () => {
    vi.useFakeTimers();
    try {
      const before: (number | undefined)[] = [...PARS.slice(0, 17), undefined];
      const after = PARS.slice(0, 17).concat([PARS[17] + 1]); // one over on the last hole
      const posts = await playTransition(before, after);
      expect(posts.some((p) => p.category === "course-record")).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("fires course-record-pace once a live round through 9+ holes is clearly ahead of the prior mark's own pace, but not before hole 9", async () => {
    vi.useFakeTimers();
    try {
      // Two birdies in the front 9 (holes 1 and 2, both par 3 played in 2), everything else at
      // par -- two shots better than the 2012 round's own (level-par) pace through 9 holes.
      const before = [PARS[0] - 1, PARS[1] - 1, PARS[2], PARS[3], PARS[4], PARS[5], PARS[6], PARS[7], undefined].concat(Array(9).fill(undefined));
      const after = [PARS[0] - 1, PARS[1] - 1, PARS[2], PARS[3], PARS[4], PARS[5], PARS[6], PARS[7], PARS[8]].concat(Array(9).fill(undefined));
      const posts = await playTransition(before, after);
      const pacePosts = posts.filter((p) => p.category === "course-record-pace");
      expect(pacePosts.length).toBe(1);
      expect(pacePosts[0].body).toContain("9 holes");
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not fire course-record-pace when only 1 shot ahead of the prior mark's pace (below the margin)", async () => {
    vi.useFakeTimers();
    try {
      // One birdie only -- one shot better than the 2012 round's pace through 9, below the
      // 2-shot margin course-record-pace requires.
      const before = [PARS[0] - 1, PARS[1], PARS[2], PARS[3], PARS[4], PARS[5], PARS[6], PARS[7], undefined].concat(Array(9).fill(undefined));
      const after = [PARS[0] - 1, PARS[1], PARS[2], PARS[3], PARS[4], PARS[5], PARS[6], PARS[7], PARS[8]].concat(Array(9).fill(undefined));
      const posts = await playTransition(before, after);
      expect(posts.some((p) => p.category === "course-record-pace")).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
