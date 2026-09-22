import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { allocateStrokes } from "@/lib/scoring";
import { parseTeeTimeMinutes } from "@/lib/data/scorecards";
import type { Player as PayloadPlayer, Scorecard, TeeTimeRound, Venue } from "@/payload-types";

/**
 * Everything needed to replay a finished championship's leaderboard minute by minute.
 *
 * No per-hole timestamps exist -- a scorecard carries one scoreUpdatedAt, overwritten on every
 * save, so even 2026's real timings are long gone. The timeline is therefore derived rather than
 * recorded: every championship stores its tee sheet, and every venue its pars, so the moment a
 * group walked off a given green follows from when they teed off plus how long the holes in front
 * of them take. The same arithmetic the 2016 rerun uses to schedule itself.
 *
 * That makes it modelled, not measured. A group that lost a ball on the 7th is not in the data, so
 * a given minute may be slightly off -- but the ORDER holes were completed in is right, which is
 * what a leaderboard replay actually depends on.
 *
 * Deliberately returns raw material rather than pre-computed standings: the client recomputes the
 * board at whatever moment the viewer scrubs to, which is far cheaper than shipping 200 snapshots.
 */

/** Minutes a group takes to play a hole, by par. Matches the rerun's model. */
const HOLE_MINUTES: Record<number, number> = { 3: 10, 4: 13, 5: 15 };

export interface ReplayHole {
  strokes?: number;
  noReturn: boolean;
  /** Minutes after the first group teed off, when this hole was completed. */
  at: number;
}

export interface ReplayPlayer {
  id: string;
  name: string;
  countryCode?: string;
  handicap: number;
  teeTime: string;
  holes: ReplayHole[];
}

export interface ChampionshipReplay {
  year: number;
  venueName: string;
  holeInfos: { par: number; si: number }[];
  par: number;
  /** Clock label for minute 0, e.g. "10.00" -- the first group's tee time. */
  firstTeeTime: string;
  /** Total minutes from the first tee shot to the last putt. */
  durationMinutes: number;
  players: ReplayPlayer[];
}

export async function getChampionshipReplay(year: number): Promise<ChampionshipReplay | undefined> {
  const payload = await getPayload({ config: configPromise });

  const championshipResult = await payload.find({ collection: "championships", where: { year: { equals: year } }, limit: 1, depth: 1 });
  const championship = championshipResult.docs[0];
  if (!championship) return undefined;

  const venue = typeof championship.venue === "object" ? (championship.venue as Venue) : undefined;
  if (!venue?.holes?.length) return undefined;

  const holeInfos = Array.from({ length: 18 }, (_, i) => ({
    par: venue.holes?.[i]?.par ?? 4,
    si: venue.holes?.[i]?.si ?? i + 1,
  }));

  const [rounds, scorecards] = await Promise.all([
    payload.find({
      collection: "tee-time-rounds",
      where: { and: [{ championship: { equals: championship.id } }, { round: { equals: "Championship" } }] },
      limit: 50,
      depth: 0,
    }),
    payload.find({ collection: "scorecards", where: { championship: { equals: championship.id } }, limit: 300, depth: 1 }),
  ]);

  // Who played with whom, and when they went out.
  const teeTimeByPlayer = new Map<string, string>();
  for (const round of rounds.docs as TeeTimeRound[]) {
    for (const group of round.groups ?? []) {
      for (const player of group.players ?? []) {
        const id = String(typeof player === "object" ? player.id : player);
        if (group.time) teeTimeByPlayer.set(id, group.time);
      }
    }
  }
  if (teeTimeByPlayer.size === 0) return undefined; // no tee sheet, no timeline

  const teeMinutes = Array.from(teeTimeByPlayer.values()).map(parseTeeTimeMinutes).filter(Number.isFinite);
  const firstTeeMinutes = Math.min(...teeMinutes);
  const firstTeeTime = Array.from(teeTimeByPlayer.values()).find((t) => parseTeeTimeMinutes(t) === firstTeeMinutes) ?? "";

  let durationMinutes = 0;
  const players: ReplayPlayer[] = [];

  for (const card of scorecards.docs as Scorecard[]) {
    const payloadPlayer = card.player as PayloadPlayer;
    const id = String(payloadPlayer.id);
    const teeTime = teeTimeByPlayer.get(id);
    if (!teeTime) continue; // on a card but not on the tee sheet: no way to place them in time

    const scored = (card.holes ?? []).filter((h) => h.strokes != null || h.noReturn).length;
    if (scored === 0) continue;

    // The card's own handicap, so a replayed year is scored the way it was played.
    const handicap = card.playingHandicap ?? payloadPlayer.championshipHandicap ?? 0;

    let elapsed = parseTeeTimeMinutes(teeTime) - firstTeeMinutes;
    const holes: ReplayHole[] = holeInfos.map((info, i) => {
      elapsed += HOLE_MINUTES[info.par] ?? 13;
      const hole = card.holes?.[i];
      return { strokes: hole?.strokes ?? undefined, noReturn: Boolean(hole?.noReturn), at: elapsed };
    });
    durationMinutes = Math.max(durationMinutes, elapsed);

    players.push({
      id,
      name: payloadPlayer.name,
      countryCode: payloadPlayer.countryCode ?? undefined,
      handicap,
      teeTime,
      holes,
    });
  }

  if (players.length === 0) return undefined;

  return {
    year,
    venueName: venue.name,
    holeInfos,
    par: holeInfos.reduce((sum, h) => sum + h.par, 0),
    firstTeeTime,
    durationMinutes,
    players,
  };
}

/** Strokes received per hole, exported so the client ranks exactly as the real leaderboard does. */
export function strokesReceivedFor(handicap: number, holeInfos: { par: number; si: number }[]): number[] {
  return allocateStrokes(handicap, holeInfos);
}
