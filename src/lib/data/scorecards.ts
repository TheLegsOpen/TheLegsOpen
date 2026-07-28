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
  /** Undefined until the player has posted at least one hole. */
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
    const playerId = typeof doc.player === "object" ? doc.player.id : doc.player;
    const teeTime = teeTimeByPlayer.get(String(playerId));
    const thru = started ? (holesCompleted >= 18 ? "F" : String(holesCompleted)) : (teeTime ?? "—");

    if (competition === "main") {
      return {
        player,
        score: started ? (doc.nettTotal ?? 0) : undefined,
        toPar: started ? (doc.toParNett ?? undefined) : 0,
        thru,
        sortValue: doc.nettTotal ?? 0,
      };
    }
    if (competition === "scratch") {
      return {
        player,
        score: started ? (doc.grossTotal ?? 0) : undefined,
        toPar: started ? (doc.toParGross ?? undefined) : 0,
        thru,
        sortValue: doc.grossTotal ?? 0,
      };
    }
    return {
      player,
      score: started ? (doc.stablefordTotal ?? 0) : undefined,
      toPar: undefined,
      thru,
      sortValue: -(doc.stablefordTotal ?? 0),
    };
  });

  rows.sort((a, b) => a.sortValue - b.sortValue);

  const entries: CompetitionEntry[] = [];
  let position = 0;
  let previousSortValue: number | undefined;

  rows.forEach((row, index) => {
    if (row.sortValue !== previousSortValue) {
      position = index + 1;
    }
    const tied = rows.filter((r) => r.sortValue === row.sortValue).length > 1;
    entries.push({ position, tied, player: row.player, score: row.score, toPar: row.toPar, thru: row.thru });
    previousSortValue = row.sortValue;
  });

  return entries;
}
