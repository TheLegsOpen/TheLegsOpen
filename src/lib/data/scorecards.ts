import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { mapPlayer } from "@/lib/data/players";
import type { Player } from "@/types/player";
import type { Player as PayloadPlayer, Championship as PayloadChampionship } from "@/payload-types";
import type { Payload } from "payload";

export type Competition = "main" | "stableford" | "scratch";

export interface CompetitionEntry {
  position: number;
  tied: boolean;
  player: Player;
  /** Main/Scratch: undefined until all 18 holes are posted. Stableford: always populated, starting at 0. */
  score?: number;
  toPar?: number;
  thru: string;
}

/** Whichever championship is flagged "Currently Being Scored" — falls back to the most recent by year. */
async function getActiveChampionship(payload: Payload): Promise<PayloadChampionship | undefined> {
  const active = await payload.find({ collection: "championships", where: { isActive: { equals: true } }, limit: 1 });
  if (active.docs[0]) return active.docs[0];
  const latest = await payload.find({ collection: "championships", sort: "-year", limit: 1 });
  return latest.docs[0];
}

export async function getActiveChampionshipId(): Promise<string | undefined> {
  const payload = await getPayload({ config: configPromise });
  const championship = await getActiveChampionship(payload);
  return championship?.id;
}

/** "12.00" or "08:12" -> minutes since midnight, for sorting not-yet-started players by tee time. Unparsable sorts last. */
function parseTeeTimeMinutes(time: string): number {
  const match = time.match(/(\d{1,2})[.:](\d{2})/);
  if (!match) return Number.POSITIVE_INFINITY;
  return Number(match[1]) * 60 + Number(match[2]);
}

export async function getCompetitionLeaderboard(competition: Competition): Promise<CompetitionEntry[]> {
  const payload = await getPayload({ config: configPromise });
  const championship = await getActiveChampionship(payload);
  if (!championship) return [];

  const [result, teeTimeRounds] = await Promise.all([
    payload.find({
      collection: "scorecards",
      where: { championship: { equals: championship.id } },
      limit: 300,
      depth: 1,
    }),
    payload.find({
      collection: "tee-time-rounds",
      where: { and: [{ championship: { equals: championship.id } }, { round: { equals: "Championship" } }] },
      limit: 50,
      depth: 0,
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

    // tieKey groups players into the same standing — lower is better for main/scratch (to-par),
    // negated Stableford points so the same ascending comparator works for both.
    if (competition === "main") {
      return {
        player,
        holesCompleted,
        started,
        teeTimeMinutes,
        thru,
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
      // Stableford points show live from 0 rather than waiting for the round to start, unlike Main/Scratch.
      score: doc.stablefordTotal ?? 0,
      toPar: started ? (doc.toParNett ?? 0) : 0,
      tieKey: -(doc.stablefordTotal ?? 0),
    };
  });

  rows.sort((a, b) => {
    if (a.started !== b.started) return a.started ? -1 : 1;
    if (!a.started) return a.teeTimeMinutes - b.teeTimeMinutes;
    if (a.tieKey !== b.tieKey) return a.tieKey - b.tieKey;
    return b.holesCompleted - a.holesCompleted;
  });

  const entries: CompetitionEntry[] = [];
  let position = 0;
  let previousGroupKey: string | undefined;

  rows.forEach((row, index) => {
    const groupKey = row.started ? `started:${row.tieKey}` : "not-started";
    if (groupKey !== previousGroupKey) {
      position = index + 1;
    }
    const tied = rows.filter((r) => (r.started ? `started:${r.tieKey}` : "not-started") === groupKey).length > 1;
    entries.push({ position, tied, player: row.player, score: row.score, toPar: row.toPar, thru: row.thru });
    previousGroupKey = groupKey;
  });

  return entries;
}
