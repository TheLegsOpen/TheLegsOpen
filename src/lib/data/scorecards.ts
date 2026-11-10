import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { mapPlayer } from "@/lib/data/players";
import { hasBeenPlayedWhere } from "@/lib/data/championship-timing";
import { cachedQuery, LEADERBOARD_TAGS, slimPlayer } from "@/lib/data-cache";
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
  /** A pickup on this specific hole (Main/Scratch only -- see below). Distinguishes "picked up here" from merely "not played yet", both of which otherwise show as the same blank `value: undefined`. */
  noReturn?: boolean;
  /** Minutes past midnight when this hole was posted, from the scorecard's own stamp. Present from
   * 2027; undefined for every backdated round, which is why round-timeline.ts still needs its
   * tee-sheet model. */
  recordedAtMinutes?: number;
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
  /** The player left the course without finishing (injury, illness). Unlike a no return this isn't
   * a scoring decision, so it applies to every competition -- Stableford included -- and sorts
   * below the no returns rather than among them. Shown as "WD". */
  withdrawn?: boolean;
  /** The player was on the tee sheet but never returned a score, and the round is over -- so they
   * didn't play. Sorts below everyone with a result, including the no returns and withdrawals.
   * While a round is still in progress this stays false: a player yet to tee off belongs in the
   * field at level par, not at the foot of the board. */
  didNotStart?: boolean;
  /** Main/Scratch only — a hole marked "no return" disqualifies this player from this competition; shown as "NR" and sorted to the bottom. Stableford is never affected. */
  noReturn?: boolean;
}

/**
 * Whichever championship is flagged "Currently Being Scored" — falls back to the most recently
 * *played* one, not simply the highest year. See lib/data/championship-timing.ts for why that
 * distinction matters now that championships are entered ahead of being played.
 *
 * Pass `req` when calling from inside a hook so this reads within the same in-flight transaction
 * (e.g. the very write that triggered the hook) instead of a separate connection that can't see it yet.
 */
// Falls back to undefined instead of throwing -- see the fallback on getSiteTheme
// (src/lib/data/site-theme.ts) for why. This is a widely shared helper (sponsor clock, playoffs,
// leaderboards, tee times, the scoring app...), so most callers already treat "no active
// championship" as a legitimate, handled state rather than an error.
export async function getActiveChampionship(payload: Payload, req?: PayloadRequest): Promise<PayloadChampionship | undefined> {
  try {
    // sort -year: with two ticked, the later one wins -- see activeChampionshipIndex.
    const active = await payload.find({ collection: "championships", where: { isActive: { equals: true } }, sort: "-year", limit: 1, req });
    if (active.docs[0]) return active.docs[0];

    // The most recently played one, as a where clause rather than by loading the collection and
    // filtering in JS. That shortcut cost the site an outage: this helper runs roughly nine times
    // per page render (three leaderboards, live blog, weather, sponsor clock, news ticker, two
    // scoring-statistics calls), and at Payload's default depth every extra championship returned
    // drags in its venue -- eighteen-row holes array and photo gallery included -- plus the winning
    // player. Fifteen documents instead of one, nine times over, was enough to exhaust the
    // connection pool during the re-render storm that follows a revalidation, and dynamic pages
    // started flapping between 200 and 500. Keep this to limit-1 queries.
    const played = await payload.find({ collection: "championships", where: hasBeenPlayedWhere(), sort: "-year", limit: 1, req });
    if (played.docs[0]) return played.docs[0];

    // Nothing has been played yet: the nearest championship still to come beats showing nothing.
    const nearest = await payload.find({ collection: "championships", sort: "year", limit: 1, req });
    return nearest.docs[0];
  } catch {
    return undefined;
  }
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

export { parseTeeTimeMinutes } from "@/lib/data/tee-time-order";
import { parseTeeTimeMinutes } from "@/lib/data/tee-time-order";

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
  // The card's own playingHandicap wins wherever it is set: it records what the player actually
  // received on the day, and survives their handicap being re-derived for a later championship.
  // Falling back to the player's current figure keeps every card scored before that field existed
  // rendering exactly as it did. Championship leaderboards fall back to Championship Handicap; the
  // practice-round leaderboard (see getPracticeLeaderboard) passes Practice Handicap instead.
  getHandicap: (player: Player, doc: PayloadScorecard) => number = (p, d) =>
    d.playingHandicap ?? p.championshipHandicap ?? 0,
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

    const strokesReceived = allocateStrokes(getHandicap(player, doc), holeInfos);
    /** The stored stamp as minutes past midnight, in the championship's own local time. */
    const recordedMinutes = (i: number): number | undefined => {
      const iso = doc.holes?.[i]?.recordedAt;
      if (!iso) return undefined;
      const at = new Date(iso);
      return Number.isNaN(at.getTime()) ? undefined : at.getHours() * 60 + at.getMinutes();
    };
    const holes: HoleScore[] = holeInfos.map((info, i) => {
      const strokes = doc.holes?.[i]?.strokes ?? undefined;
      const recordedAtMinutes = recordedMinutes(i);
      if (doc.holes?.[i]?.noReturn) {
        // A pickup on this specific hole. Main/Scratch have no valid score for it -- and the
        // whole card is disqualified anyway, see `noReturn` below -- but Stableford scores an
        // unreturned hole as 0 points, same as real Stableford rules, so it isn't itself "NR".
        if (competition === "stableford") {
          return { holeNumber: i + 1, par: info.par, recordedAtMinutes, value: 0, relative: 0 - 2 };
        }
        return { holeNumber: i + 1, par: info.par, recordedAtMinutes, value: undefined, relative: 0, noReturn: true };
      }
      if (strokes == null) {
        return { holeNumber: i + 1, par: info.par, recordedAtMinutes, value: undefined, relative: 0 };
      }
      if (competition === "scratch") {
        return { holeNumber: i + 1, par: info.par, recordedAtMinutes, value: strokes, relative: strokes - info.par };
      }
      const nett = strokes - strokesReceived[i];
      if (competition === "main") {
        return { holeNumber: i + 1, par: info.par, recordedAtMinutes, value: nett, relative: nett - info.par };
      }
      const points = stablefordPoints(nett, info.par);
      return { holeNumber: i + 1, par: info.par, recordedAtMinutes, value: points, relative: points - 2 };
    });

    // A hole marked "no return" disqualifies Main/Scratch for that player — sorted below every
    // valid score via a sentinel tieKey, and shown as "NR" rather than a position/score. Stableford
    // is never disqualified: it keeps accumulating from the player's other holes as normal.
    const noReturn = competition !== "stableford" && Boolean(doc.noReturn);

    // A withdrawal outranks a no return as a reason to have no result: the player didn't decline
    // to finish, they couldn't. It therefore applies to Stableford too, where a pick-up doesn't.
    // rank sorts the board into three bands before score is even considered -- players with a
    // result, then the no returns, then the withdrawals.
    const withdrawn = Boolean(doc.withdrawn);
    const rank = withdrawn ? 2 : noReturn ? 1 : 0;

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
        withdrawn,
        rank,
        score: noReturn || withdrawn ? undefined : finished ? (doc.nettTotal ?? 0) : undefined,
        toPar: noReturn || withdrawn ? undefined : started ? (doc.toParNett ?? 0) : 0,
        tieKey: noReturn || withdrawn ? Number.POSITIVE_INFINITY : (doc.toParNett ?? 0),
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
        withdrawn,
        rank,
        score: noReturn || withdrawn ? undefined : finished ? (doc.grossTotal ?? 0) : undefined,
        toPar: noReturn || withdrawn ? undefined : started ? (doc.toParGross ?? 0) : 0,
        tieKey: noReturn || withdrawn ? Number.POSITIVE_INFINITY : (doc.toParGross ?? 0),
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
      withdrawn,
      rank,
      // Stableford points show live from 0 rather than waiting for the round to start, unlike Main/Scratch.
      score: withdrawn ? undefined : (doc.stablefordTotal ?? 0),
      // Unlike `noReturn` above (which stays false -- Stableford correctly keeps scoring through a
      // pickup, worth 0 points for that hole, not disqualified), this "Par" figure is actually the
      // Main competition's nett-to-par shown for reference -- and that number is genuinely
      // meaningless once Main itself is disqualified, so it goes to "NR" here too rather than
      // showing a stale/misleading value.
      toPar: doc.noReturn || withdrawn ? undefined : started ? (doc.toParNett ?? 0) : 0,
      tieKey: withdrawn ? Number.POSITIVE_INFINITY : -(doc.stablefordTotal ?? 0),
    };
  });

  // Once every player who teed off has finished, anyone still without a score never played, and
  // parking them at level par would float them above the whole field -- in 2018 that would have
  // put four men who never hit a shot ahead of the champion, and handed one of them the title,
  // since the title-holder is simply the first row. They drop below the no returns and the
  // withdrawals instead. Mid-round this doesn't apply, for the reason below.
  const startedRows = rows.filter((row) => row.started);
  const concluded = startedRows.length > 0 && startedRows.every((row) => row.holesCompleted >= 18);
  if (concluded) {
    for (const row of rows) if (!row.started) row.rank = 3;
  }

  // Not-started players carry the same baseline tieKey (level par / 0 points) as a genuinely
  // level-scoring started player, so they sort into the field by that value first — a player
  // who's actually over par outranks nobody just because someone else hasn't teed off yet.
  // Holes played breaks ties within a score group, then tee-time breaks ties among players who
  // are still level on both (chiefly the not-yet-started group).
  rows.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    if (a.tieKey !== b.tieKey) return a.tieKey - b.tieKey;
    if (a.holesCompleted !== b.holesCompleted) return b.holesCompleted - a.holesCompleted;
    return a.teeTimeMinutes - b.teeTimeMinutes;
  });

  const entries: CompetitionEntry[] = [];
  let position = 0;
  let previousGroupKey: string | undefined;

  rows.forEach((row, index) => {
    // The band is part of the key, so a no return and a withdrawal sharing the sentinel tieKey
    // don't get merged into one position group.
    const groupKey = `${row.rank}:${row.tieKey}`;
    if (groupKey !== previousGroupKey) {
      position = index + 1;
    }
    // Everyone sharing a position shares a "T", the no returns and withdrawals included: six
    // players with no result really are all equal last, and printing a bare "6" six times over
    // reads like six different placings.
    const tied = rows.filter((r) => `${r.rank}:${r.tieKey}` === groupKey).length > 1;
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
      withdrawn: row.withdrawn,
      didNotStart: concluded && !row.started,
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
  // Inside a hook, read live within the transaction -- never from the cross-request cache.
  if (req) return buildActiveLeaderboard(competition, req);
  return getCachedActiveLeaderboard(competition).catch(() => []);
}

async function buildActiveLeaderboard(competition: Competition, req?: PayloadRequest): Promise<CompetitionEntry[]> {
  const payload = req?.payload ?? (await getPayload({ config: configPromise }));
  const { championship, holeInfos, docs, teeTimeByPlayer } = await loadLeaderboardInputs(payload, req);
  if (!championship) return [];
  return buildLeaderboardFromDocs(competition, holeInfos, docs, teeTimeByPlayer);
}

// See src/lib/data-cache.ts. Every save to a scorecard, player, championship, venue or tee sheet
// expires this immediately, so live scoring stays live. Between saves, every page showing the
// leaderboard shares one read instead of each render pulling every scorecard at depth 2.
//
// getActiveChampionship swallows a failed read as "no championship", which would look identical to
// a real empty board. So an empty board is never cached: it throws here, and the caller above turns
// it back into []. Re-reading an empty board is cheap; caching a pooler blip for an hour isn't.
const getCachedActiveLeaderboard = cachedQuery("leaderboard:active", LEADERBOARD_TAGS, async (competition: Competition) => {
  const entries = await buildActiveLeaderboard(competition);
  if (entries.length === 0) throw new Error("Empty leaderboard is not cached");
  return slimEntries(entries);
});

function slimEntries(entries: CompetitionEntry[]): CompetitionEntry[] {
  return entries.map((entry) => ({ ...entry, player: slimPlayer(entry.player) }));
}

/** Same as `getCompetitionLeaderboard`, but for a specific (possibly past) championship rather
 * than whichever is currently active — used by Records to auto-derive stats from a concluded
 * year's real scorecards. Pass `req` when calling from inside a Payload hook (e.g. the live-blog
 * pipeline's championship-records checks) so this reads within that same in-flight transaction
 * instead of opening a fresh connection — required for the fake-payload test harness too, which
 * never initializes a real Payload instance at all. */
export async function getCompetitionLeaderboardForChampionshipId(
  championshipId: string,
  competition: Competition,
  req?: PayloadRequest,
): Promise<CompetitionEntry[]> {
  if (req) {
    const championship = await req.payload.findByID({ collection: "championships", id: championshipId, req }).catch(() => undefined);
    if (!championship) return [];
    return buildLeaderboardForChampionship(req.payload, championship, competition, req);
  }
  // A failed read throws inside the cached function, so it isn't cached as an empty board. It
  // becomes the same empty result the uncached version always returned here, outside the cache.
  return getCachedChampionshipLeaderboard(championshipId, competition).catch(() => []);
}

async function buildLeaderboardForChampionship(
  payload: Payload,
  championship: PayloadChampionship,
  competition: Competition,
  req?: PayloadRequest,
): Promise<CompetitionEntry[]> {
  const { holeInfos, docs, teeTimeByPlayer } = await loadLeaderboardInputs(payload, req, championship);
  return buildLeaderboardFromDocs(competition, holeInfos, docs, teeTimeByPlayer);
}

// The single biggest egress saving on the site. A player profile asks for every past year's board
// three times over (results, playoffs, career stats), and Records, Previous Opens and the venue
// pages ask again. A concluded year's board only changes when someone edits it, so it's read once
// and served from cache until a save expires it.
const getCachedChampionshipLeaderboard = cachedQuery(
  "leaderboard:by-championship",
  LEADERBOARD_TAGS,
  async (championshipId: string, competition: Competition) => {
    const payload = await getPayload({ config: configPromise });
    const championship = await payload.findByID({ collection: "championships", id: championshipId });
    return slimEntries(await buildLeaderboardForChampionship(payload, championship, competition));
  },
);

export interface ScorecardParticipation {
  championshipId: string;
  playerId: string;
  started: boolean;
}

/** Every scorecard across every championship, reduced to "did this player actually play this year" — the real, automatic basis for appearance-count records (as opposed to the hand-maintained `Player.previousOpens` legacy counter). Practice-round scorecards (no championship) are excluded -- they're not a Legs Open appearance. */
export async function getAllScorecardParticipation(options?: { fresh?: boolean }): Promise<ScorecardParticipation[]> {
  // `fresh` for callers inside a save hook: they run before the hook that expires the cache, and
  // possibly outside a Next request at all, where unstable_cache has no store to read.
  return options?.fresh ? loadScorecardParticipation() : getCachedScorecardParticipation();
}

// Every scorecard ever entered, read for Records and the Field page's Debutants filter -- cached
// like the leaderboards (src/lib/data-cache.ts), since it only changes when a card is saved.
const getCachedScorecardParticipation = cachedQuery("scorecard-participation", LEADERBOARD_TAGS, () => loadScorecardParticipation());

async function loadScorecardParticipation(): Promise<ScorecardParticipation[]> {
  const payload = await getPayload({ config: configPromise });
  const result = await payload.find({ collection: "scorecards", where: { championship: { exists: true } }, limit: 2000, depth: 0 });
  return result.docs.map((doc) => ({
    championshipId: String(typeof doc.championship === "object" ? doc.championship?.id : doc.championship),
    playerId: String(typeof doc.player === "object" ? doc.player.id : doc.player),
    started: (doc.holesCompleted ?? 0) > 0,
  }));
}

/**
 * Stableford-only standings for a single practice round -- the on-course scoring app's leaderboard
 * during a practice day (see /score/leaderboard). Deliberately doesn't reuse
 * getCompetitionLeaderboard: that's championship-shaped (isActive lookup, Main/Scratch too, tied to
 * the public /leaderboard page) and a practice day has no championship at all, only a Tee Time
 * Round and its linked venue/scorecards.
 */
export async function getPracticeLeaderboard(teeTimeRoundId: string, req?: PayloadRequest): Promise<CompetitionEntry[]> {
  const payload = req?.payload ?? (await getPayload({ config: configPromise }));
  const round = await payload.findByID({ collection: "tee-time-rounds", id: teeTimeRoundId, depth: 1, req }).catch(() => undefined);
  if (!round) return [];

  const venue = typeof round.venue === "object" ? (round.venue as PayloadVenue) : undefined;
  const holeInfos = Array.from({ length: 18 }, (_, i) => ({
    par: venue?.holes?.[i]?.par ?? 4,
    si: venue?.holes?.[i]?.si ?? i + 1,
  }));

  const result = await payload.find({
    collection: "scorecards",
    where: { teeTimeRound: { equals: teeTimeRoundId } },
    limit: 100,
    depth: 2,
    req,
  });

  const teeTimeByPlayer = new Map<string, string>();
  for (const group of round.groups ?? []) {
    for (const player of group.players ?? []) {
      const playerId = typeof player === "object" ? player.id : player;
      if (playerId != null) teeTimeByPlayer.set(String(playerId), group.time);
    }
  }

  // Same fallback as Scorecards.ts's own handicap resolution -- see the comment there for why an
  // unset practice handicap must not mean scratch. Kept identical so the leaderboard can never
  // disagree with the totals stored on the scorecards themselves.
  return buildLeaderboardFromDocs(
    "stableford",
    holeInfos,
    result.docs,
    teeTimeByPlayer,
    (p, d) => d.playingHandicap ?? p.practiceHandicap ?? p.championshipHandicap ?? 0,
  );
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
