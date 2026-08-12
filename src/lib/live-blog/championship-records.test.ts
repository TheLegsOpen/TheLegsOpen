import { describe, expect, it, vi } from "vitest";
import { generateLiveBlogPosts } from "@/lib/live-blog/generate";
import { computeScorecardTotals } from "@/lib/scoring";
import { createFakePayload } from "@/lib/live-blog/__fixtures__/fake-payload";
import { CHAMPIONSHIP, PLAYERS, VENUE, VENUE_HOLES, TEE_TIME_ROUND, findPlayer } from "@/lib/live-blog/__fixtures__/2013-replay-fixtures";
import type { PayloadRequest } from "payload";
import type { Scorecard, Championship } from "@/payload-types";

const HOLE_INFOS = VENUE_HOLES.map((h) => ({ par: h.par, si: h.si }));
const PARS = VENUE_HOLES.map((h) => h.par);

const PRIOR_YEAR = 2012;
const PRIOR_CHAMPIONSHIP: Championship = { ...CHAMPIONSHIP, id: "champ-2012", year: PRIOR_YEAR } as Championship;

/** Prior champion (Robert Hamilton, handicap 6) plays level par everywhere -- his nett strokes
 * follow real stroke-index allocation, giving a real, non-hand-picked nett-to-par as the baseline
 * "record" to beat. Prior runner-up (Scott Ingram, handicap 13) also plays level par -- with a
 * higher handicap they net *better* than the winner hole-for-hole, so to keep this a clean win for
 * Hamilton (not a tie) the runner-up plays one worse than par on hole 6 (the hardest, SI 1).
 */
function buildScorecard(id: string, playerId: string, championship: Championship, strokesAdjustments: Record<number, number> = {}): Scorecard {
  const player = findPlayer(playerId);
  const strokes = PARS.map((par, i) => par + (strokesAdjustments[i + 1] ?? 0));
  const holes = strokes.map((s, i) => ({ holeNumber: i + 1, strokes: s, noReturn: false }));
  const totals = computeScorecardTotals(
    holes.map((h) => h.strokes),
    holes.map((h) => h.noReturn),
    HOLE_INFOS,
    player.championshipHandicap ?? 0,
  );
  return {
    id,
    player,
    championship,
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

describe("championship-wide records (largest margin, lowest winning score, record lead) checked against genuinely prior championships", () => {
  it("fires record-low-score at winner-confirmed when the new champion's nett total beats the all-time lowest winning score", async () => {
    vi.useFakeTimers();
    try {
      // Prior championship: Robert Hamilton (handicap 6) wins on level par nett -- the baseline record.
      const priorWinner = buildScorecard("sc-2012-winner", "31", PRIOR_CHAMPIONSHIP);
      const priorRunnerUp = buildScorecard("sc-2012-runnerup", "30", PRIOR_CHAMPIONSHIP, { 6: 1 });

      // Current championship: a single player (John Pow) finishes 3 shots better nett than level
      // par -- comfortably clear of the 2012 mark, and the only started player, so the round
      // concludes (isConcluded only requires every *started* player to be finished).
      const before = buildScorecard("sc-live", "26", CHAMPIONSHIP, {});
      before.holes = (before.holes ?? []).map((h, i) => (i < 17 ? h : { ...h, strokes: undefined }));
      before.holesCompleted = 17;

      const after = buildScorecard("sc-live", "26", CHAMPIONSHIP, { 1: -1, 2: -1, 3: -1 });
      (after as unknown as { scoreUpdatedAt: string }).scoreUpdatedAt = "2026-08-12T09:00:00.000Z";

      const payload = createFakePayload({
        championships: [CHAMPIONSHIP, PRIOR_CHAMPIONSHIP] as unknown as (Record<string, unknown> & { id: string })[],
        players: PLAYERS as unknown as (Record<string, unknown> & { id: string })[],
        venues: [VENUE as unknown as Record<string, unknown> & { id: string }],
        scorecards: [priorWinner, priorRunnerUp, after] as unknown as (Record<string, unknown> & { id: string })[],
        "tee-time-rounds": [TEE_TIME_ROUND as unknown as Record<string, unknown> & { id: string }],
        globals: {
          "live-blog-config": { enabled: true, minimumSignificance: 35, cooldownSeconds: 90, maxPostsPerHour: 100 } as unknown as Record<string, unknown> & {
            id: string;
          },
        },
      });
      const req = { payload } as unknown as PayloadRequest;

      await generateLiveBlogPosts({ doc: after, previousDoc: before, req, operation: "update", context: {} } as unknown as Parameters<
        typeof generateLiveBlogPosts
      >[0]);

      const posts = payload.liveBlogPosts() as unknown as { category: string; headline: string; body: string }[];
      const recordPosts = posts.filter((p) => p.category === "record-low-score");
      expect(recordPosts.length).toBe(1);
      expect(recordPosts[0].body).toContain("John Pow");
      // Whoever actually posted the better prior-year nett score holds the record -- Scott Ingram's
      // higher handicap nets him ahead of Robert Hamilton in this fixture despite Hamilton's
      // "winner" scorecard label, and the record correctly follows the real number, not the label.
      expect(recordPosts[0].body).toContain("Scott Ingram");
      expect(recordPosts[0].body).toContain(String(PRIOR_YEAR));
    } finally {
      vi.useRealTimers();
    }
  });
});
