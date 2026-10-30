import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { mapPlayer } from "@/lib/data/players";
import { formatWeekdayDate } from "@/lib/utils";
import type { TeeTimeRound } from "@/types/championship";
import type { Player as PayloadPlayer, TeeTimeRound as PayloadTeeTimeRound } from "@/payload-types";

/**
 * Data-access seam for tee time pairings — now backed by the
 * TeeTimeRounds collection in Payload/Postgres.
 */
function mapTeeTimeRounds(docs: PayloadTeeTimeRound[]): TeeTimeRound[] {
  return docs.map((doc) => ({
    round: doc.round,
    date: doc.date ? formatWeekdayDate(doc.date) : "",
    groups: (doc.groups ?? []).map((group) => ({
      time: group.time,
      tee: group.tee,
      players: group.players.map((p) => mapPlayer(p as PayloadPlayer)),
    })),
  }));
}

export async function getTeeTimes(): Promise<TeeTimeRound[]> {
  const payload = await getPayload({ config: configPromise });
  const result = await payload.find({
    collection: "tee-time-rounds",
    where: { archived: { not_equals: true } },
    sort: "id",
    // depth 2, not 1 -- players are nested inside groups (1 level), so resolving each
    // player's own photo relationship needs a second level or it comes back as a bare ID.
    depth: 2,
    limit: 50,
  });

  return mapTeeTimeRounds(result.docs);
}

/**
 * Same as `getTeeTimes`, but for a specific (possibly past, possibly archived) championship rather
 * than whichever is currently active -- used by Previous Opens to show a concluded year's tee
 * sheet regardless of its archived flag.
 *
 * Championship rounds only. A practice round is filed under the championship's year, which is how
 * it is organised in the admin, but it is not part of the result: nothing on it was scored towards
 * anything, and in the Results tab it sat above the round that counted as though the two were
 * equals. The live Tee Times page still shows both, which is where a practice tee sheet is
 * actually useful.
 */
export async function getTeeTimesForChampionshipId(championshipId: string): Promise<TeeTimeRound[]> {
  const payload = await getPayload({ config: configPromise });
  const result = await payload.find({
    collection: "tee-time-rounds",
    where: { and: [{ championship: { equals: championshipId } }, { round: { equals: "Championship" } }] },
    sort: "id",
    depth: 2,
    limit: 50,
  });

  return mapTeeTimeRounds(result.docs);
}
