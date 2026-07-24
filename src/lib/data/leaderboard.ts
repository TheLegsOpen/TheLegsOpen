import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { mapPlayer } from "@/lib/data/players";
import type { LeaderboardEntry } from "@/types/player";
import type { Player as PayloadPlayer } from "@/payload-types";

export type LeaderboardRound = "round2" | "round4";

/**
 * Data-access seam for live scoring — now backed by the LeaderboardEntries
 * collection in Payload/Postgres. Genuinely-live scoring during a real
 * tournament would still want a short-revalidation or realtime layer on top
 * of this; for now it's a plain query per request.
 */
export async function getLeaderboard(round: LeaderboardRound): Promise<LeaderboardEntry[]> {
  const payload = await getPayload({ config: configPromise });
  const result = await payload.find({
    collection: "leaderboard-entries",
    where: { round: { equals: round } },
    sort: "position",
    depth: 1,
    limit: 200,
  });

  return result.docs.map((doc) => ({
    position: doc.position,
    tied: doc.tied ?? false,
    player: mapPlayer(doc.player as PayloadPlayer),
    scoreToPar: doc.scoreToPar,
    thru: doc.thru,
    rounds: (doc.rounds ?? []).map((r) => r.score),
    total: doc.total,
    favoritable: true as const,
  }));
}
