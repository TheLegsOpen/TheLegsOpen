import type { PayloadRequest } from "payload";

import { formatToPar } from "@/lib/leaderboard";
import type { Competition, LeaderboardSnapshotPair } from "@/lib/data/scorecards";
import { buildRaceTracker, diffRaceTrackers } from "@/lib/live-blog/race-tracker";
import { evaluateAndPublish, type PublicationConfig, type TriggerCandidate } from "@/lib/live-blog/publication-policy";
import {
  leaderCommentary,
  tieCommentary,
  leadExtendsCommentary,
  enteringContentionCommentary,
  leavingContentionCommentary,
} from "@/lib/live-blog/commentary";

const COMPETITION_LABEL: Record<Competition, string> = { main: "Main", stableford: "Stableford", scratch: "Scratch" };
const ALL_COMPETITIONS: Competition[] = ["main", "stableford", "scratch"];

/** Below this many started players, "leader"/"tie"/"contention" is a meaningless artifact of a thin field, not a real race -- skip it rather than flip-flopping "takes control" every time someone posts their first hole. */
const MIN_STARTED_FOR_RACE_EVENTS = 4;

function scoreLabel(competition: Competition, value: number): string {
  return competition === "stableford" ? `${value} pts` : formatToPar(value);
}

/**
 * Entering/leaving-contention dedup: only fires if the player's most recent contention-status
 * post for this competition isn't already the same direction (so a player who's already flagged
 * "into contention" doesn't get re-flagged every hole they stay there). New-leader, tie, and
 * lead-extends don't need this -- they're transition-triggered by construction in
 * diffRaceTrackers, so each only fires on the exact save that causes the change. This is a
 * narrative-direction guard, distinct from evaluateAndPublish's fingerprint dedup below (which
 * only catches an exact retry of the same save, not "the player re-entered contention a few
 * holes later" -- a legitimate, different event that should still post).
 */
async function lastContentionDirection(
  req: PayloadRequest,
  championshipId: string,
  competition: Competition,
  playerId: string,
): Promise<"entering-contention" | "leaving-contention" | undefined> {
  const result = await req.payload.find({
    collection: "live-blog-posts",
    where: {
      and: [
        { championship: { equals: championshipId } },
        { competition: { equals: competition } },
        { player: { equals: playerId } },
        { category: { in: ["entering-contention", "leaving-contention"] } },
      ],
    },
    sort: "-postedAt",
    limit: 1,
    depth: 0,
    req,
  });
  const category = result.docs[0]?.category;
  return category === "entering-contention" || category === "leaving-contention" ? category : undefined;
}

/**
 * Race Tracker pass: given the before/after leaderboard snapshot pair for this scorecard save
 * (see getLeaderboardSnapshotPair), diffs the Race Tracker for all three competitions and
 * publishes any leader/tie/lead-extension/contention transitions. Called from
 * generateLiveBlogPosts (src/lib/live-blog/generate.ts) alongside the existing per-hole
 * eagle/birdie/bogey/streak detection, which already has this same snapshot's "after" side
 * (`snapshots.after.main`) available as `mainEntries` -- no second fetch needed.
 */
export async function generateRaceTrackerPosts(
  req: PayloadRequest,
  championshipId: string,
  snapshots: LeaderboardSnapshotPair,
  saveNonce: string,
  config: PublicationConfig,
): Promise<void> {
  for (const competition of ALL_COMPETITIONS) {
    const startedCount = snapshots.after[competition].filter((e) => e.started).length;
    if (startedCount < MIN_STARTED_FOR_RACE_EVENTS) continue;

    const beforeTracker = buildRaceTracker(snapshots.before[competition], competition);
    const afterTracker = buildRaceTracker(
      snapshots.after[competition],
      competition,
      new Set(beforeTracker.members.map((m) => m.playerId)),
    );
    const candidates = diffRaceTrackers(beforeTracker, afterTracker);
    const label = COMPETITION_LABEL[competition];

    for (const candidate of candidates) {
      if (candidate.kind === "entering-contention" || candidate.kind === "leaving-contention") {
        const lastDirection = await lastContentionDirection(req, championshipId, competition, candidate.playerId);
        if (lastDirection === candidate.kind) continue;
      }

      const saveNonceForCandidate = `${saveNonce}:${competition}:${candidate.kind}:${candidate.playerId}`;

      if (candidate.kind === "new-leader") {
        const { headline, body } = leaderCommentary(candidate.playerName, scoreLabel(competition, candidate.scoreValue), label);
        await evaluateAndPublish(req, {
          category: "leader",
          championshipId,
          playerId: candidate.playerId,
          playerName: candidate.playerName,
          saveNonce: saveNonceForCandidate,
          significance: { category: "leader", inContention: true },
          post: { category: "leader", competition, headline, body, championship: championshipId, player: candidate.playerId, scoreRelative: candidate.scoreValue },
        } satisfies TriggerCandidate, config);
      } else if (candidate.kind === "tie-for-lead") {
        const { headline, body } = tieCommentary(candidate.playerName, scoreLabel(competition, candidate.scoreValue), label);
        await evaluateAndPublish(req, {
          category: "tie",
          championshipId,
          playerId: candidate.playerId,
          playerName: candidate.playerName,
          saveNonce: saveNonceForCandidate,
          significance: { category: "tie", inContention: true },
          post: { category: "tie", competition, headline, body, championship: championshipId, player: candidate.playerId, scoreRelative: candidate.scoreValue },
        } satisfies TriggerCandidate, config);
      } else if (candidate.kind === "lead-extends") {
        const { headline, body } = leadExtendsCommentary(candidate.playerName, candidate.leadMargin ?? 0, label);
        await evaluateAndPublish(req, {
          category: "lead-extends",
          championshipId,
          playerId: candidate.playerId,
          playerName: candidate.playerName,
          saveNonce: saveNonceForCandidate,
          significance: { category: "lead-extends", inContention: true },
          post: { category: "lead-extends", competition, headline, body, championship: championshipId, player: candidate.playerId, scoreRelative: candidate.scoreValue },
        } satisfies TriggerCandidate, config);
      } else if (candidate.kind === "entering-contention") {
        const { headline, body } = enteringContentionCommentary(candidate.playerName, label);
        await evaluateAndPublish(req, {
          category: "entering-contention",
          championshipId,
          playerId: candidate.playerId,
          playerName: candidate.playerName,
          saveNonce: saveNonceForCandidate,
          significance: { category: "entering-contention", inContention: true },
          post: { category: "entering-contention", competition, headline, body, championship: championshipId, player: candidate.playerId },
        } satisfies TriggerCandidate, config);
      } else if (candidate.kind === "leaving-contention") {
        const { headline, body } = leavingContentionCommentary(candidate.playerName, label);
        await evaluateAndPublish(req, {
          category: "leaving-contention",
          championshipId,
          playerId: candidate.playerId,
          playerName: candidate.playerName,
          saveNonce: saveNonceForCandidate,
          significance: { category: "leaving-contention", inContention: true },
          post: { category: "leaving-contention", competition, headline, body, championship: championshipId, player: candidate.playerId },
        } satisfies TriggerCandidate, config);
      }
    }
  }
}
