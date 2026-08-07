import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { mapPlayer } from "@/lib/data/players";
import { allocateStrokes, stablefordPoints } from "@/lib/scoring";
import type { Player } from "@/types/player";
import type {
  Player as PayloadPlayer,
  Championship as PayloadChampionship,
  Venue as PayloadVenue,
  Scorecard as PayloadScorecard,
} from "@/payload-types";
import type { Payload, PayloadRequest } from "payload";

export type Competition = "main" | "stableford" | "scratch";

export interface HoleScore {
  holeNumber: number;
  par: number;
  /** Nett score (Main), gross score (Scratch), or points (Stableford) for this hole — undefined if not yet played. */
  value?: number;
  /** value relative to "expected" (par for Main/Scratch, 2pts for Stableford) — drives the under/level/over colour. */
  relative: number;
}

export interface CompetitionEntry {
  position: number;
  tied: boolean;
  player: Player;
  /** Main/Scratch: undefined until all 18 holes are posted. Stableford: always populated, starting at 0. */
  score?: number;
  toPar?: number;
  /** True once the player has posted a strokes value on at least one hole. */
  started: boolean;
  /** "F" once finished, otherwise the hole count while in progress, otherwise "-" (not started). */
  thru: string;
  /** Raw tee time (e.g. "12.00") from the Championship-round tee sheet, empty if not found. */
  teeTime: string;
  holes: HoleScore[];
  /** Main/Scratch only — a hole marked "no return" disqualifies this player from this competition; shown as "NR" and sorted to the bottom. Stableford is never affected. */
  noReturn?: boolean;
}

/**
 * Whichever championship is flagged "Currently Being Scored" — falls back to the most recent by year.
 * Pass `req` when calling from inside a hook so this reads within the same in-flight transaction
 * (e.g. the very write that triggered the hook) instead of a separate connection that can't see it yet.
 */
export async function getActiveChampionship(payload: Payload, req?: PayloadRequest): Promise<PayloadChampionship | undefined> {
  const active = await payload.find({ collection: "championships", where: { isActive: { equals: true } }, limit: 1, req });
  if (active.docs[0]) return active.docs[0];
  const latest = await payload.find({ collection: "championships", sort: "-year", limit: 1, req });
  return latest.docs[0];
}

export async function getActiveChampionshipId(): Promise<string | undefined> {
  const payload = await getPayload({ config: configPromise });
  const championship = await getActiveChampionship(payload);
  return championship?.id;
}

/** Whether the given venue is hosting the currently active championship -- only that venue has live hole-by-hole scoring data. */
export async function isActiveChampionshipVenue(venueSlug: string): Promise<boolean> {
  const payload = await getPayload({ config: configPromise });
  const championship = await getActiveChampionship(payload);
  const venue = championship && typeof championship.venue === "object" ? (championship.venue as PayloadVenue) : undefined;
  return venue?.slug === venueSlug;
}

/** "12.00" or "08:12" -> minutes since midnight, for sorting not-yet-started players by tee time. Unparsable sorts last. */
export function parseTeeTimeMinutes(time: string): number {
  const match = time.match(/(\d{1,2})[.:](\d{2})/);
  if (!match) return Number.POSITIVE_INFINITY;
  return Number(match[1]) * 60 + Number(match[2]);
}

interface LeaderboardInputs {
  championship: PayloadChampionship | undefined;
  holeInfos: { par: number; si: number }[];
  docs: PayloadScorecard[];
  teeTimeByPlayer: Map<string, string>;
}

/**
 * Fetches everything `buildLeaderboardFromDocs` needs (venue pars, every scorecard, and the
 * tee-time sheet) in one pass, so callers that need more than one derived view -- e.g. the Race
 * Tracker's before/after snapshot pair -- don't repeat the same queries per competition. Defaults
 * to whichever championship is active; pass one explicitly to build a past year's leaderboard
 * (e.g. for Records, once that year's round is over).
 */
async function loadLeaderboardInputs(
  payload: Payload,
  req?: PayloadRequest,
  championshipOverride?: PayloadChampionship,
): Promise<LeaderboardInputs> {
  const championship = championshipOverride ?? (await getActiveChampionship(payload, req));
  if (!championship) return { championship: undefined, holeInfos: [], docs: [], teeTimeByPlayer: new Map() };

  const venue = typeof championship.venue === "object" ? (championship.venue as PayloadVenue) : undefined;
  const holeInfos = Array.from({ length: 18 }, (_, i) => ({
    par: venue?.holes?.[i]?.par ?? 4,
    si: venue?.holes?.[i]?.si ?? i + 1,
  }));

  const [result, teeTimeRounds] = await Promise.all([
    payload.find({
      collection: "scorecards",
      where: { championship: { equals: championship.id } },
      limit: 300,
      // depth 2, not 1 -- resolves each scorecard's player relation *and* that player's own
      // photo relation, otherwise photo comes back as a bare ID and player-popup can't show it.
      depth: 2,
      req,
    }),
    payload.find({
      collection: "tee-time-rounds",
      where: { and: [{ championship: { equals: championship.id } }, { round: { equals: "Championship" } }] },
      limit: 50,
      depth: 0,
      req,
    }),
  ]);

  const teeTimeByPlayer = new Map<string, string>();
  for (const round of teeTimeRounds.docs) {
    for (const group of round.groups ?? []) {
      for (const player of group.players ?? []) {
        const playerId = typeof player === "object" ? player.id : player;
        if (playerId != null) teeTimeByPlayer.set(String(playerId), group.time);
      }
    }
  }

  return { championship, holeInfos, docs: result.docs, teeTimeByPlayer };
}

function buildLeaderboardFromDocs(
  competition: Competition,
  holeInfos: { par: number; si: number }[],
  docs: PayloadScorecard[],
  teeTimeByPlayer: Map<string, string>,
): CompetitionEntry[] {
  const rows = docs.map((doc) => {
    const player = mapPlayer(doc.player as PayloadPlayer);
    const holesCompleted = doc.holesCompleted ?? 0;
    const started = holesCompleted > 0;
    const finished = holesCompleted >= 18;
    const playerId = typeof doc.player === "object" ? doc.player.id : doc.player;
    const teeTime = teeTimeByPlayer.get(String(playerId)) ?? "";
    const thru = started ? (finished ? "F" : String(holesCompleted)) : "-";
    const teeTimeMinutes = parseTeeTimeMinutes(teeTime);

    const strokesReceived = allocateStrokes(player.championshipHandicap ?? 0, holeInfos);
    const holes: HoleScore[] = holeInfos.map((info, i) => {
      const strokes = doc.holes?.[i]?.strokes ?? undefined;
      if (strokes == null) {
        return { holeNumber: i + 1, par: info.par, value: undefined, relative: 0 };
      }
      if (competition === "scratch") {
        return { holeNumber: i + 1, par: info.par, value: strokes, relative: strokes - info.par };
      }
      const nett = strokes - strokesReceived[i];
      if (competition === "main") {
        return { holeNumber: i + 1, par: info.par, value: nett, relative: nett - info.par };
      }
      const points = stablefordPoints(nett, info.par);
      return { holeNumber: i + 1, par: info.par, value: points, relative: points - 2 };
    });

    // A hole marked "no return" disqualifies Main/Scratch for that player — sorted below every
    // valid score via a sentinel tieKey, and shown as "NR" rather than a position/score. Stableford
    // is never disqualified: it keeps accumulating from the player's other holes as normal.
    const noReturn = competition !== "stableford" && Boolean(doc.noReturn);

    // tieKey groups players into the same standing — lower is better for main/scratch (to-par),
    // negated Stableford points so the same ascending comparator works for both.
    if (competition === "main") {
      return {
        player,
        holesCompleted,
        started,
        teeTimeMinutes,
        teeTime,
        thru,
        holes,
        noReturn,
        score: noReturn ? undefined : finished ? (doc.nettTotal ?? 0) : undefined,
        toPar: noReturn ? undefined : started ? (doc.toParNett ?? 0) : 0,
        tieKey: noReturn ? Number.POSITIVE_INFINITY : (doc.toParNett ?? 0),
      };
    }
    if (competition === "scratch") {
      return {
        player,
        holesCompleted,
        started,
        teeTimeMinutes,
        teeTime,
        thru,
        holes,
        noReturn,
        score: noReturn ? undefined : finished ? (doc.grossTotal ?? 0) : undefined,
        toPar: noReturn ? undefined : started ? (doc.toParGross ?? 0) : 0,
        tieKey: noReturn ? Number.POSITIVE_INFINITY : (doc.toParGross ?? 0),
      };
    }
    return {
      player,
      holesCompleted,
      started,
      teeTimeMinutes,
      teeTime,
      thru,
      holes,
      noReturn,
      // Stableford points show live from 0 rather than waiting for the round to start, unlike Main/Scratch.
      score: doc.stablefordTotal ?? 0,
      toPar: started ? (doc.toParNett ?? 0) : 0,
      tieKey: -(doc.stablefordTotal ?? 0),
    };
  });

  // Not-started players carry the same baseline tieKey (level par / 0 points) as a genuinely
  // level-scoring started player, so they sort into the field by that value first — a player
  // who's actually over par outranks nobody just because someone else hasn't teed off yet.
  // Holes played breaks ties within a score group, then tee-time breaks ties among players who
  // are still level on both (chiefly the not-yet-started group).
  rows.sort((a, b) => {
    if (a.tieKey !== b.tieKey) return a.tieKey - b.tieKey;
    if (a.holesCompleted !== b.holesCompleted) return b.holesCompleted - a.holesCompleted;
    return a.teeTimeMinutes - b.teeTimeMinutes;
  });

  const entries: CompetitionEntry[] = [];
  let position = 0;
  let previousGroupKey: string | undefined;

  rows.forEach((row, index) => {
    const groupKey = String(row.tieKey);
    if (groupKey !== previousGroupKey) {
      position = index + 1;
    }
    // NR players share the same sentinel tieKey but aren't meaningfully "tied" with each other —
    // each is individually disqualified, not level on score.
    const tied = !row.noReturn && rows.filter((r) => String(r.tieKey) === groupKey).length > 1;
    entries.push({
      position,
      tied,
      player: row.player,
      score: row.score,
      toPar: row.toPar,
      started: row.started,
      thru: row.thru,
      teeTime: row.teeTime,
      holes: row.holes,
      noReturn: row.noReturn,
    });
    previousGroupKey = groupKey;
  });

  return entries;
}

/**
 * Pass `req` when calling from inside a hook (e.g. the Scorecards afterChange hook that
 * generates live blog posts) so this reads within the same in-flight transaction as the
 * write that triggered it -- otherwise it queries a separate connection that can't see
 * that write until the outer transaction commits, one hook invocation late.
 */
export async function getCompetitionLeaderboard(competition: Competition, req?: PayloadRequest): Promise<CompetitionEntry[]> {
  const payload = req?.payload ?? (await getPayload({ config: configPromise }));
  const { championship, holeInfos, docs, teeTimeByPlayer } = await loadLeaderboardInputs(payload, req);
  if (!championship) return [];
  return buildLeaderboardFromDocs(competition, holeInfos, docs, teeTimeByPlayer);
}

/** Same as `getCompetitionLeaderboard`, but for a specific (possibly past) championship rather than whichever is currently active — used by Records to auto-derive stats from a concluded year's real scorecards. */
export async function getCompetitionLeaderboardForChampionshipId(
  championshipId: string,
  competition: Competition,
): Promise<CompetitionEntry[]> {
  const payload = await getPayload({ config: configPromise });
  const championship = await payload.findByID({ collection: "championships", id: championshipId }).catch(() => undefined);
  if (!championship) return [];
  const { holeInfos, docs, teeTimeByPlayer } = await loadLeaderboardInputs(payload, undefined, championship);
  return buildLeaderboardFromDocs(competition, holeInfos, docs, teeTimeByPlayer);
}

export interface ScorecardParticipation {
  championshipId: string;
  playerId: string;
  started: boolean;
}

/** Every scorecard across every championship, reduced to "did this player actually play this year" — the real, automatic basis for appearance-count records (as opposed to the hand-maintained `Player.previousOpens` legacy counter). */
export async function getAllScorecardParticipation(): Promise<ScorecardParticipation[]> {
  const payload = await getPayload({ config: configPromise });
  const result = await payload.find({ collection: "scorecards", limit: 2000, depth: 0 });
  return result.docs.map((doc) => ({
    championshipId: String(typeof doc.championship === "object" ? doc.championship.id : doc.championship),
    playerId: String(typeof doc.player === "object" ? doc.player.id : doc.player),
    started: (doc.holesCompleted ?? 0) > 0,
  }));
}

export interface LeaderboardSnapshotPair {
  before: Record<Competition, CompetitionEntry[]>;
  after: Record<Competition, CompetitionEntry[]>;
}

const ALL_COMPETITIONS: Competition[] = ["main", "stableford", "scratch"];

/**
 * Builds "the leaderboard as it stood immediately before this save" alongside the current
 * leaderboard, for all three competitions, from a single fetch -- used by the Race Tracker to
 * diff before/after state without a persisted snapshot table. The "before" world is reconstructed
 * by swapping the just-changed scorecard back to its `previousDoc` shape (which already carries
 * its own correct totals, computed by the same beforeValidate hook on its own prior save) while
 * leaving every other player's card untouched.
 */
export async function getLeaderboardSnapshotPair(
  req: PayloadRequest,
  changedScorecardId: string,
  previousDoc: PayloadScorecard,
): Promise<LeaderboardSnapshotPair | undefined> {
  const { championship, holeInfos, docs, teeTimeByPlayer } = await loadLeaderboardInputs(req.payload, req);
  if (!championship) return undefined;

  const changedAfterDoc = docs.find((d) => String(d.id) === String(changedScorecardId));
  // `previousDoc` comes from the hook at whatever depth the write used (typically un-populated),
  // so borrow the already-populated `player` relation from the freshly-fetched (depth: 1) doc.
  const beforeDocForPlayer: PayloadScorecard = changedAfterDoc ? { ...previousDoc, player: changedAfterDoc.player } : previousDoc;
  const beforeDocs = docs.map((d) => (String(d.id) === String(changedScorecardId) ? beforeDocForPlayer : d));

  const before = {} as Record<Competition, CompetitionEntry[]>;
  const after = {} as Record<Competition, CompetitionEntry[]>;
  for (const competition of ALL_COMPETITIONS) {
    before[competition] = buildLeaderboardFromDocs(competition, holeInfos, beforeDocs, teeTimeByPlayer);
    after[competition] = buildLeaderboardFromDocs(competition, holeInfos, docs, teeTimeByPlayer);
  }
  return { before, after };
}
