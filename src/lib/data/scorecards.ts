import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { mapPlayer } from "@/lib/data/players";
import { allocateStrokes, stablefordPoints } from "@/lib/scoring";
import type { Player } from "@/types/player";
import type { Player as PayloadPlayer, Championship as PayloadChampionship, Venue as PayloadVenue } from "@/payload-types";
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
  thru: string;
  holes: HoleScore[];
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

/** "12.00" or "08:12" -> minutes since midnight, for sorting not-yet-started players by tee time. Unparsable sorts last. */
export function parseTeeTimeMinutes(time: string): number {
  const match = time.match(/(\d{1,2})[.:](\d{2})/);
  if (!match) return Number.POSITIVE_INFINITY;
  return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * Pass `req` when calling from inside a hook (e.g. the Scorecards afterChange hook that
 * generates live blog posts) so this reads within the same in-flight transaction as the
 * write that triggered it -- otherwise it queries a separate connection that can't see
 * that write until the outer transaction commits, one hook invocation late.
 */
export async function getCompetitionLeaderboard(competition: Competition, req?: PayloadRequest): Promise<CompetitionEntry[]> {
  const payload = req?.payload ?? (await getPayload({ config: configPromise }));
  const championship = await getActiveChampionship(payload, req);
  if (!championship) return [];

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
      depth: 1,
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

  const rows = result.docs.map((doc) => {
    const player = mapPlayer(doc.player as PayloadPlayer);
    const holesCompleted = doc.holesCompleted ?? 0;
    const started = holesCompleted > 0;
    const finished = holesCompleted >= 18;
    const playerId = typeof doc.player === "object" ? doc.player.id : doc.player;
    const teeTime = teeTimeByPlayer.get(String(playerId)) ?? "";
    const thru = started ? (finished ? "F" : String(holesCompleted)) : teeTime || "—";
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

    // tieKey groups players into the same standing — lower is better for main/scratch (to-par),
    // negated Stableford points so the same ascending comparator works for both.
    if (competition === "main") {
      return {
        player,
        holesCompleted,
        started,
        teeTimeMinutes,
        thru,
        holes,
        score: finished ? (doc.nettTotal ?? 0) : undefined,
        toPar: started ? (doc.toParNett ?? 0) : 0,
        tieKey: doc.toParNett ?? 0,
      };
    }
    if (competition === "scratch") {
      return {
        player,
        holesCompleted,
        started,
        teeTimeMinutes,
        thru,
        holes,
        score: finished ? (doc.grossTotal ?? 0) : undefined,
        toPar: started ? (doc.toParGross ?? 0) : 0,
        tieKey: doc.toParGross ?? 0,
      };
    }
    return {
      player,
      holesCompleted,
      started,
      teeTimeMinutes,
      thru,
      holes,
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
    const tied = rows.filter((r) => String(r.tieKey) === groupKey).length > 1;
    entries.push({ position, tied, player: row.player, score: row.score, toPar: row.toPar, thru: row.thru, holes: row.holes });
    previousGroupKey = groupKey;
  });

  return entries;
}
