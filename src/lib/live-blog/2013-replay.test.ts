import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PayloadRequest } from "payload";

import { generateLiveBlogPosts } from "@/lib/live-blog/generate";
import { computeScorecardTotals } from "@/lib/scoring";
import { CRITICAL_CATEGORIES } from "@/lib/live-blog/significance";
import { createFakePayload } from "@/lib/live-blog/__fixtures__/fake-payload";
import { CHAMPIONSHIP, PLAYERS, VENUE, VENUE_HOLES, TEE_TIME_ROUND, findPlayer } from "@/lib/live-blog/__fixtures__/2013-replay-fixtures";
import replayEventsJson from "@/lib/live-blog/__fixtures__/2013-replay-events.json";
import type { LiveBlogPost, LiveBlogTriggerLog, Scorecard } from "@/payload-types";

/**
 * Replays the real 2013 championship (11 players, 4 groups, real handicaps and hole-by-hole
 * scores, real Carnwath pars/stroke-indexes) through the actual production generateLiveBlogPosts
 * hook -- unmodified, same function the real Scorecards afterChange hook calls -- against an
 * in-memory fake of the Payload Local API (see fake-payload.ts) instead of a live server and
 * database. `2013-replay-events.json` is the literal, timestamped log from the live production
 * replay run on 2026-08-11 (11:00-16:08 BST): 72 real scorecard saves (one per group per hole),
 * expanded to 198 individual player-hole entries in the order they actually posted. The system
 * clock is faked to each event's real timestamp before every call, so cooldown/rate-limit
 * behaviour is exercised exactly as it was live -- just in milliseconds instead of ~4 hours.
 *
 * This exists because that 4-hour live run was the only way this session had to catch two real
 * bugs (a cooldown scope bug and a same-player multi-category post redundancy) -- both are now
 * fixed in the code this test exercises. Re-running this after any future change to the live-blog
 * pipeline validates it against the same real data in seconds, without needing another live replay.
 */

interface ReplayEvent {
  ts: string;
  holeNumber: number;
  playerName: string;
  strokes: number;
}

const replayEvents = replayEventsJson as ReplayEvent[];
const HOLE_INFOS = VENUE_HOLES.map((h) => ({ par: h.par, si: h.si }));

function blankScorecard(playerId: string): Scorecard {
  const player = findPlayer(playerId);
  return {
    id: `sc-${playerId}`,
    player,
    championship: CHAMPIONSHIP,
    holes: Array.from({ length: 18 }, (_, i) => ({ holeNumber: i + 1, strokes: undefined, noReturn: false })),
    holesCompleted: 0,
    grossTotal: 0,
    nettTotal: 0,
    stablefordTotal: 0,
    toParGross: 0,
    toParNett: 0,
    noReturn: false,
    updatedAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

interface ReplayResult {
  payload: ReturnType<typeof createFakePayload>;
  finalScorecards: Map<string, Scorecard>;
  /** Posts created by each individual generateLiveBlogPosts call, in replay order -- lets tests
   * check "did THIS ONE hook invocation over-post for a player" precisely, rather than inferring
   * it from postedAt proximity (unreliable here: several real events share an identical recorded
   * timestamp because the original live orchestrator only logged one timestamp per batch of
   * players posted in the same request, and the fake clock doesn't advance between calls unless
   * told to -- see the note on the "no more than one..." test below). */
  postsByInvocation: LiveBlogPost[][];
}

async function runFullReplay(): Promise<ReplayResult> {
  const scorecards = PLAYERS.map((p) => blankScorecard(p.id));
  const current = new Map<string, Scorecard>(scorecards.map((s) => [(s.player as { id: string }).id, s]));

  const payload = createFakePayload({
    championships: [CHAMPIONSHIP as unknown as Record<string, unknown> & { id: string }],
    players: PLAYERS as unknown as (Record<string, unknown> & { id: string })[],
    venues: [VENUE as unknown as Record<string, unknown> & { id: string }],
    scorecards: scorecards as unknown as (Record<string, unknown> & { id: string })[],
    "tee-time-rounds": [TEE_TIME_ROUND as unknown as Record<string, unknown> & { id: string }],
    globals: {
      "live-blog-config": { enabled: true, minimumSignificance: 35, cooldownSeconds: 90, maxPostsPerHour: 100 } as unknown as Record<string, unknown> & {
        id: string;
      },
    },
  });
  const req = { payload } as unknown as PayloadRequest;
  const postsByInvocation: LiveBlogPost[][] = [];

  for (const event of replayEvents) {
    vi.setSystemTime(new Date(event.ts));

    const player = PLAYERS.find((p) => p.name === event.playerName);
    if (!player) throw new Error(`Unknown fixture player ${event.playerName}`);

    const previousDoc = current.get(player.id);
    if (!previousDoc) throw new Error(`No scorecard seeded for ${event.playerName}`);

    const holes = (previousDoc.holes ?? []).map((h, i) => (i === event.holeNumber - 1 ? { ...h, strokes: event.strokes } : h));
    const totals = computeScorecardTotals(
      holes.map((h) => h.strokes),
      holes.map((h) => h.noReturn),
      HOLE_INFOS,
      player.championshipHandicap ?? 0,
    );

    const doc: Scorecard = {
      ...previousDoc,
      holes,
      holesCompleted: totals.holesCompleted,
      grossTotal: totals.grossTotal,
      nettTotal: totals.nettTotal,
      stablefordTotal: totals.stablefordTotal,
      toParGross: totals.toParGross,
      toParNett: totals.toParNett,
      noReturn: totals.noReturn,
      scoreUpdatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // The DB is already updated by the time a real afterChange hook fires -- previousDoc is a
    // separate pre-write snapshot, not something the hook re-derives from the DB itself.
    payload._seedWrite("scorecards", doc as unknown as Record<string, unknown> & { id: string });
    current.set(player.id, doc);

    const postsBefore = payload.liveBlogPosts().length;

    await generateLiveBlogPosts({
      doc,
      previousDoc,
      req,
      operation: "update",
      context: {},
    } as unknown as Parameters<typeof generateLiveBlogPosts>[0]);

    postsByInvocation.push((payload.liveBlogPosts() as unknown as LiveBlogPost[]).slice(postsBefore));
  }

  return { payload, finalScorecards: current, postsByInvocation };
}

describe("2013 replay (real production data through the real production hook)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("processes all 198 real hole-by-hole entries without throwing", async () => {
    await expect(runFullReplay()).resolves.toBeDefined();
  });

  it("confirms the real 2013 result: Alastair Campbell wins Main via playoff over Bobby Ferguson", async () => {
    const { payload } = await runFullReplay();
    const posts = payload.liveBlogPosts() as unknown as LiveBlogPost[];

    const playoff = posts.find((p) => p.category === "playoff");
    expect(playoff?.body).toContain("Bobby Ferguson");
    expect(playoff?.body).toContain("Alastair Campbell");

    const mainWinner = posts.find((p) => p.category === "winner-confirmed" && p.competition === "main");
    expect(mainWinner?.body).toContain("Alastair Campbell");
    expect(mainWinner?.body).toContain("Beat Bobby Ferguson on countback");

    const stablefordWinner = posts.find((p) => p.category === "winner-confirmed" && p.competition === "stableford");
    expect(stablefordWinner?.body).toContain("Bobby Ferguson");

    const scratchWinner = posts.find((p) => p.category === "winner-confirmed" && p.competition === "scratch");
    expect(scratchWinner?.body).toContain("Alastair Campbell");

    // The playoff announcement must precede its own result, not follow it.
    expect(playoff && mainWinner && posts.indexOf(playoff) < posts.indexOf(mainWinner)).toBe(true);
  });

  it("no longer suppresses a player's own first birdie via COOLDOWN just because an unrelated post fired moments earlier (the cooldown-scope bug this replay caught live)", async () => {
    const { payload } = await runFullReplay();
    const triggerLog = payload.liveBlogTriggerLog() as unknown as LiveBlogTriggerLog[];
    const johnPow = findPlayer("26");

    // live-blog-trigger-log.player is stored unpopulated (a bare id string) by evaluateAndPublish
    // itself, matching real production -- compare by id, not by a resolved name. In the live
    // 2013 replay this was suppressed with reason COOLDOWN one second after an unrelated
    // "championship: under way" post, purely because the cooldown lookup was championship-wide
    // rather than scoped to this player -- that's the bug fixed here. It's legitimately superseded
    // now by this same save's higher-significance "through" post instead (both are Main-competition
    // stories about the same moment -- see the per-player-per-competition filter test below) --
    // that's a different, intentional mechanism, not a regression of this one.
    const johnPowHole1Birdie = triggerLog.find((row) => row.category === "birdie" && row.holeNumber === 1 && String(row.player) === johnPow.id);
    expect(johnPowHole1Birdie).toBeDefined();
    expect(johnPowHole1Birdie?.suppressionReason).not.toBe("COOLDOWN");
  });

  it("never publishes more than one non-critical, same-competition post for the same player from a single hook invocation (the per-player-per-competition priority filter)", async () => {
    const { postsByInvocation } = await runFullReplay();

    // Sourced from the real significance.ts set (not a hand-duplicated local list) so this test
    // can't silently drift out of sync the way it did before -- it was still checking an old,
    // smaller CRITICAL list (missing albatross, defending-champion, and eventually course-record)
    // that happened not to matter until a newly-critical category first co-occurred with another
    // post for the same player in this fixture.
    // The four per-hole Main categories carry a criticalOverride when the player is leading or
    // within striking distance (generate.ts), which -- like a genuinely critical category --
    // exempts that one candidate from the priority filter's grouping entirely. That candidate
    // isn't persisted with any marker of the override, so a post-hoc check over saved posts can't
    // tell "legitimately exempt" apart from "the filter failed to group it" -- but it CAN tell
    // that a >1 group containing one of these four is expected, not a bug, since only they have
    // the override at all. A group of >1 posts with none of these four present is still a real
    // failure of the filter.
    const MAY_BE_OVERRIDDEN = new Set(["nett-eagle", "birdie", "bogey", "double-bogey"]);
    const offenders: { key: string; posts: LiveBlogPost[] }[] = [];

    for (const invocationPosts of postsByInvocation) {
      const byPlayerAndCompetition = new Map<string, LiveBlogPost[]>();
      for (const post of invocationPosts) {
        if (CRITICAL_CATEGORIES.has(post.category) || !post.player || !post.competition) continue;
        const key = `${String(post.player)}:${post.competition}`;
        const group = byPlayerAndCompetition.get(key) ?? [];
        group.push(post);
        byPlayerAndCompetition.set(key, group);
      }
      for (const [key, group] of byPlayerAndCompetition) {
        if (group.length > 1 && !group.some((p) => MAY_BE_OVERRIDDEN.has(p.category))) offenders.push({ key, posts: group });
      }
    }

    expect(offenders).toEqual([]);
  });

  it("publishes a substantial, non-trivial number of posts across the full round", async () => {
    const { payload } = await runFullReplay();
    expect(payload.liveBlogPosts().length).toBeGreaterThan(50);
  });
});
