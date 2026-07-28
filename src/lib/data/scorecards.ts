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
  score: number;
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

  const result = await payload.find({
    collection: "scorecards",
    where: { championship: { equals: championship.id } },
    limit: 300,
    depth: 1,
  });

  const rows = result.docs
    .filter((doc) => (doc.holesCompleted ?? 0) > 0)
    .map((doc) => {
      const player = mapPlayer(doc.player as PayloadPlayer);
      const thru = (doc.holesCompleted ?? 0) >= 18 ? "F" : String(doc.holesCompleted ?? 0);

      if (competition === "main") {
        return { player, score: doc.nettTotal ?? 0, toPar: doc.toParNett ?? undefined, thru, sortValue: doc.nettTotal ?? 0 };
      }
      if (competition === "scratch") {
        return { player, score: doc.grossTotal ?? 0, toPar: doc.toParGross ?? undefined, thru, sortValue: doc.grossTotal ?? 0 };
      }
      return { player, score: doc.stablefordTotal ?? 0, toPar: undefined, thru, sortValue: -(doc.stablefordTotal ?? 0) };
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
