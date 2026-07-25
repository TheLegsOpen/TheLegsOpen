import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { mapPlayer } from "@/lib/data/players";
import type { TeeTimeRound } from "@/types/championship";
import type { Player as PayloadPlayer } from "@/payload-types";

/**
 * Data-access seam for tee time pairings — now backed by the
 * TeeTimeRounds collection in Payload/Postgres.
 */
export async function getTeeTimes(): Promise<TeeTimeRound[]> {
  const payload = await getPayload({ config: configPromise });
  const result = await payload.find({
    collection: "tee-time-rounds",
    where: { archived: { not_equals: true } },
    sort: "id",
    depth: 1,
    limit: 50,
  });

  return result.docs.map((doc) => ({
    round: doc.round,
    day: doc.day,
    date: doc.date,
    groups: (doc.groups ?? []).map((group) => ({
      time: group.time,
      tee: group.tee,
      players: group.players.map((p) => mapPlayer(p as PayloadPlayer)),
    })),
  }));
}
