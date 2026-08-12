import { describe, expect, it, vi } from "vitest";
import { generateLiveBlogPosts } from "@/lib/live-blog/generate";
import { computeScorecardTotals } from "@/lib/scoring";
import { createFakePayload } from "@/lib/live-blog/__fixtures__/fake-payload";
import { CHAMPIONSHIP, PLAYERS, VENUE, VENUE_HOLES, TEE_TIME_ROUND, findPlayer } from "@/lib/live-blog/__fixtures__/2013-replay-fixtures";
import type { PayloadRequest } from "payload";
import type { Scorecard, Championship } from "@/payload-types";

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

const PRIOR_CHAMPIONSHIP: Championship = {
  ...CHAMPIONSHIP,
  id: "champ-2012",
  year: 2012,
  winnerName: "Robert Hamilton",
  winnerPlayer: "31",
} as Championship;

async function playHole(playerId: string, strokes: number) {
  const scorecards = PLAYERS.map((p) => blankScorecard(p.id));
  const payload = createFakePayload({
    championships: [CHAMPIONSHIP as unknown as Record<string, unknown> & { id: string }, PRIOR_CHAMPIONSHIP as unknown as Record<string, unknown> & { id: string }],
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

  const previousDoc = scorecards.find((s) => (s.player as { id: string }).id === playerId)!;
  const holes = (previousDoc.holes ?? []).map((h, i) => (i === 0 ? { ...h, strokes } : h));
  const totals = computeScorecardTotals(
    holes.map((h) => h.strokes),
    holes.map((h) => h.noReturn),
    HOLE_INFOS,
    findPlayer(playerId).championshipHandicap ?? 0,
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
    scoreUpdatedAt: "2026-08-12T09:00:00.000Z",
    updatedAt: "2026-08-12T09:00:00.000Z",
  };
  payload._seedWrite("scorecards", doc as unknown as Record<string, unknown> & { id: string });
  await generateLiveBlogPosts({ doc, previousDoc, req, operation: "update", context: {} } as unknown as Parameters<typeof generateLiveBlogPosts>[0]);

  return payload.liveBlogPosts() as unknown as { category: string; player?: unknown; headline: string; body: string }[];
}

describe("defending champion, first hole, par", () => {
  it("fires a defending-champion post when the 2012 winner pars hole 1 (no stroke received: gross 3 = nett par)", async () => {
    vi.useFakeTimers();
    try {
      const posts = await playHole("31", 3); // Robert Hamilton, handicap 6, hole 1 SI 9 -> no stroke, nett = gross = par
      const defendingChampionPosts = posts.filter((p) => p.category === "defending-champion");
      expect(defendingChampionPosts.length).toBe(1);
      expect(defendingChampionPosts[0].body).toContain("Robert Hamilton");
      expect(defendingChampionPosts[0].body).toContain("1st");
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not fire for a non-defending-champion player's par first hole", async () => {
    vi.useFakeTimers();
    try {
      const posts = await playHole("30", 4); // Scott Ingram, handicap 13, hole1 SI9 -> gets a stroke, nett = 4-1=3, +0 to par(3) -> nett par too
      const defendingChampionPosts = posts.filter((p) => p.category === "defending-champion");
      expect(defendingChampionPosts.length).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
