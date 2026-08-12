import type { PayloadRequest } from "payload";

import { formatToPar } from "@/lib/leaderboard";
import type { Competition, LeaderboardSnapshotPair } from "@/lib/data/scorecards";
import { buildRaceTracker, diffRaceTrackers, type RaceCandidate, type RaceEventKind } from "@/lib/live-blog/race-tracker";
import type { TriggerCandidate } from "@/lib/live-blog/publication-policy";
import {
  leaderCommentary,
  leaderCommentaryMulti,
  tieCommentary,
  tieCommentaryMulti,
  leadExtendsCommentary,
  leadExtendsCommentaryMulti,
  enteringContentionCommentary,
  enteringContentionCommentaryMulti,
  leavingContentionCommentary,
  leavingContentionCommentaryMulti,
} from "@/lib/live-blog/commentary";

const COMPETITION_LABEL: Record<Competition, string> = { main: "Main", stableford: "Stableford", scratch: "Scratch" };
const ALL_COMPETITIONS: Competition[] = ["main", "stableford", "scratch"];

/** Below this many started players, "leader"/"tie"/"contention" is a meaningless artifact of a thin field, not a real race -- skip it rather than flip-flopping "takes control" every time someone posts their first hole. */
const MIN_STARTED_FOR_RACE_EVENTS = 4;

/** Separate from the field-wide gate above: even once enough players have started, one specific
 * player's own leader/tie/contention story is a weak, premature signal this early into their own
 * round -- "moves into contention, thru 1" doesn't mean much when nearly the whole field is still
 * bunched by construction. Requires this many of THEIR OWN holes played before their individual
 * race-tracker candidates are eligible at all. */
const MIN_HOLES_FOR_INDIVIDUAL_RACE_STORY = 3;

function hasPlayedEnoughForRaceStory(thru: string | undefined): boolean {
  if (!thru || thru === "F") return true;
  const played = Number(thru);
  return !Number.isFinite(played) || played >= MIN_HOLES_FOR_INDIVIDUAL_RACE_STORY;
}

function scoreLabel(competition: Competition, value: number): string {
  return competition === "stableford" ? `${value} pts` : formatToPar(value);
}

function marginUnit(competition: Competition): "shot" | "point" {
  return competition === "stableford" ? "point" : "shot";
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

interface GroupedRaceCandidate {
  kind: RaceEventKind;
  playerId: string;
  playerName: string;
  outcomes: { competition: Competition; candidate: RaceCandidate }[];
}

/**
 * Race Tracker pass: given the before/after leaderboard snapshot pair for this scorecard save
 * (see getLeaderboardSnapshotPair), diffs the Race Tracker for all three competitions and
 * publishes any leader/tie/lead-extension/contention transitions. Called from
 * generateLiveBlogPosts (src/lib/live-blog/generate.ts) alongside the existing per-hole
 * eagle/birdie/bogey/streak detection, which already has this same snapshot's "after" side
 * (`snapshots.after.main`) available as `mainEntries` -- no second fetch needed.
 *
 * Candidates are collected across all three competitions -- grouped by (kind, player), since the
 * same real-world moment (one player's hole) can cross the same threshold on Main, Stableford, and
 * Scratch simultaneously, and without this grouping that produced two or three near-identical
 * posts seconds apart ("David Clee ties for the Main lead" / "...the Stableford lead" / "...the
 * Scratch lead"). A group with more than one competition publishes as a single merged post naming
 * every board involved, via the *Multi commentary variants; a group with just one -- the common
 * case once the field spreads out -- publishes exactly as before.
 *
 * Returns the built candidates rather than publishing them directly -- generateLiveBlogPosts
 * (generate.ts) collects these alongside its own per-hole/movement candidates and every other
 * source's, then runs the whole save's candidates through one shared per-player priority filter
 * (findLowerPriorityCandidates in publication-policy.ts) before anything actually publishes.
 */
export async function buildRaceTrackerCandidates(
  req: PayloadRequest,
  championshipId: string,
  snapshots: LeaderboardSnapshotPair,
  saveNonce: string,
): Promise<TriggerCandidate[]> {
  const grouped = new Map<string, GroupedRaceCandidate>();

  for (const competition of ALL_COMPETITIONS) {
    const startedCount = snapshots.after[competition].filter((e) => e.started).length;
    if (startedCount < MIN_STARTED_FOR_RACE_EVENTS) continue;

    const beforeTracker = buildRaceTracker(snapshots.before[competition], competition);
    const afterTracker = buildRaceTracker(
      snapshots.after[competition],
      competition,
      new Set(beforeTracker.members.map((m) => m.playerId)),
    );
    const candidates = diffRaceTrackers(beforeTracker, afterTracker).filter((c) => hasPlayedEnoughForRaceStory(c.thru));

    for (const candidate of candidates) {
      if (candidate.kind === "entering-contention" || candidate.kind === "leaving-contention") {
        const lastDirection = await lastContentionDirection(req, championshipId, competition, candidate.playerId);
        if (lastDirection === candidate.kind) continue;
      }

      const key = `${candidate.kind}:${candidate.playerId}`;
      const group = grouped.get(key) ?? { kind: candidate.kind, playerId: candidate.playerId, playerName: candidate.playerName, outcomes: [] };
      group.outcomes.push({ competition, candidate });
      grouped.set(key, group);
    }
  }

  // Becoming the leader or tying for it already implies "entering contention" in the strongest
  // possible sense -- reporting both for the same (player, competition) in the same save reads as
  // a redundant, weaker retelling of the moment that just happened. Drop the entering-contention
  // outcome for any competition already covered by a leader/tie event for the same player here.
  for (const group of grouped.values()) {
    if (group.kind !== "entering-contention") continue;
    const leaderGroup = grouped.get(`new-leader:${group.playerId}`);
    const tieGroup = grouped.get(`tie-for-lead:${group.playerId}`);
    const covered = new Set([...(leaderGroup?.outcomes.map((o) => o.competition) ?? []), ...(tieGroup?.outcomes.map((o) => o.competition) ?? [])]);
    if (covered.size > 0) {
      group.outcomes = group.outcomes.filter((o) => !covered.has(o.competition));
    }
  }

  const candidates: TriggerCandidate[] = [];

  for (const { kind, playerId, playerName, outcomes } of grouped.values()) {
    if (outcomes.length === 0) continue;
    const competitions = outcomes.map((o) => o.competition);
    const labels = competitions.map((c) => COMPETITION_LABEL[c]);
    const thru = outcomes[0].candidate.thru;
    const saveNonceForGroup = `${saveNonce}:${competitions.slice().sort().join("+")}:${kind}:${playerId}`;
    // Only a single-competition group carries a scoreRelative/competition on the post -- once
    // merged across boards there's no single score left to show as the tile.
    const single = outcomes.length === 1 ? outcomes[0] : undefined;

    if (kind === "new-leader") {
      const scoreLabels = outcomes.map((o) => scoreLabel(o.competition, o.candidate.scoreValue));
      const { headline, body } = single
        ? leaderCommentary(playerName, scoreLabels[0], labels[0], thru)
        : leaderCommentaryMulti(playerName, labels, scoreLabels, thru);
      candidates.push({
        category: "leader",
        championshipId,
        playerId,
        playerName,
        saveNonce: saveNonceForGroup,
        significance: { category: "leader", inContention: true, competition: single?.competition },
        post: {
          category: "leader",
          competition: single?.competition,
          headline,
          body,
          championship: championshipId,
          player: playerId,
          scoreRelative: single?.candidate.scoreValue,
        },
      } satisfies TriggerCandidate);
    } else if (kind === "tie-for-lead") {
      const scoreLabels = outcomes.map((o) => scoreLabel(o.competition, o.candidate.scoreValue));
      const { headline, body } = single
        ? tieCommentary(playerName, scoreLabels[0], labels[0], thru, single.candidate.otherLeaderNames)
        : tieCommentaryMulti(playerName, labels, scoreLabels, thru);
      candidates.push({
        category: "tie",
        championshipId,
        playerId,
        playerName,
        saveNonce: saveNonceForGroup,
        significance: { category: "tie", inContention: true, competition: single?.competition },
        post: {
          category: "tie",
          competition: single?.competition,
          headline,
          body,
          championship: championshipId,
          player: playerId,
          scoreRelative: single?.candidate.scoreValue,
        },
      } satisfies TriggerCandidate);
    } else if (kind === "lead-extends") {
      const leadMargins = outcomes.map((o) => o.candidate.leadMargin ?? 0);
      const { headline, body } = single
        ? leadExtendsCommentary(playerName, leadMargins[0], labels[0], thru)
        : leadExtendsCommentaryMulti(playerName, labels, leadMargins, thru);
      candidates.push({
        category: "lead-extends",
        championshipId,
        playerId,
        playerName,
        saveNonce: saveNonceForGroup,
        significance: { category: "lead-extends", inContention: true, competition: single?.competition },
        post: {
          category: "lead-extends",
          competition: single?.competition,
          headline,
          body,
          championship: championshipId,
          player: playerId,
          scoreRelative: single?.candidate.scoreValue,
        },
      } satisfies TriggerCandidate);
    } else if (kind === "entering-contention") {
      const margins = outcomes.map((o) => o.candidate.scoreValue);
      const units = outcomes.map((o) => marginUnit(o.competition));
      const { headline, body } = single
        ? enteringContentionCommentary(playerName, labels[0], margins[0], units[0], thru)
        : enteringContentionCommentaryMulti(playerName, labels, margins, units, thru);
      candidates.push({
        category: "entering-contention",
        championshipId,
        playerId,
        playerName,
        saveNonce: saveNonceForGroup,
        significance: { category: "entering-contention", inContention: true, competition: single?.competition },
        post: { category: "entering-contention", competition: single?.competition, headline, body, championship: championshipId, player: playerId },
      } satisfies TriggerCandidate);
    } else if (kind === "leaving-contention") {
      const margins = outcomes.map((o) => o.candidate.scoreValue);
      const units = outcomes.map((o) => marginUnit(o.competition));
      const { headline, body } = single
        ? leavingContentionCommentary(playerName, labels[0], margins[0], units[0], thru)
        : leavingContentionCommentaryMulti(playerName, labels, margins, units, thru);
      candidates.push({
        category: "leaving-contention",
        championshipId,
        playerId,
        playerName,
        saveNonce: saveNonceForGroup,
        significance: { category: "leaving-contention", inContention: true, competition: single?.competition },
        post: { category: "leaving-contention", competition: single?.competition, headline, body, championship: championshipId, player: playerId },
      } satisfies TriggerCandidate);
    }
  }

  return candidates;
}
