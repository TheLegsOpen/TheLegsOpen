import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { getActiveChampionship } from "@/lib/data/scorecards";
import { mapPlayer } from "@/lib/data/players";
import { allocateStrokes } from "@/lib/scoring";
import { formatToPar } from "@/lib/leaderboard";
import type { StatCategory, StatRow } from "@/lib/statistics";
import type { Player as PayloadPlayer, Venue } from "@/payload-types";

/**
 * Real scoring statistics computed directly from Scorecards -- the first of what will
 * become a family of "Nett Scoring", "Gross Scoring" etc. categories, replacing the old
 * placeholder driving-distance/GIR/putts stats that were never backed by real data.
 */
export async function getNettScoringCategories(): Promise<StatCategory[]> {
  const payload = await getPayload({ config: configPromise });
  const championship = await getActiveChampionship(payload);
  if (!championship) return [];

  const venue = typeof championship.venue === "object" ? (championship.venue as Venue) : undefined;
  const holeInfos = Array.from({ length: 18 }, (_, i) => ({
    par: venue?.holes?.[i]?.par ?? 4,
    si: venue?.holes?.[i]?.si ?? i + 1,
  }));

  const scorecards = await payload.find({
    collection: "scorecards",
    where: { championship: { equals: championship.id } },
    depth: 1,
    limit: 300,
  });

  const buckets: Record<3 | 4 | 5, StatRow[]> = { 3: [], 4: [], 5: [] };

  for (const doc of scorecards.docs) {
    const player = mapPlayer(doc.player as PayloadPlayer);
    const handicap = (doc.player as PayloadPlayer).championshipHandicap ?? 0;
    const strokesReceived = allocateStrokes(handicap, holeInfos);

    const totals: Record<3 | 4 | 5, { sum: number; count: number }> = {
      3: { sum: 0, count: 0 },
      4: { sum: 0, count: 0 },
      5: { sum: 0, count: 0 },
    };

    holeInfos.forEach((info, i) => {
      const strokes = doc.holes?.[i]?.strokes;
      if (strokes == null) return;
      const par = info.par as 3 | 4 | 5;
      if (par !== 3 && par !== 4 && par !== 5) return;
      const nett = strokes - strokesReceived[i];
      totals[par].sum += nett - info.par;
      totals[par].count += 1;
    });

    ([3, 4, 5] as const).forEach((par) => {
      const { sum, count } = totals[par];
      if (count === 0) return;
      buckets[par].push({ player, value: sum, display: formatToPar(sum) });
    });
  }

  ([3, 4, 5] as const).forEach((par) => {
    buckets[par].sort((a, b) => a.value - b.value);
    let position = 0;
    buckets[par].forEach((row, index) => {
      if (index === 0 || row.value !== buckets[par][index - 1].value) position = index + 1;
      row.position = position;
      row.tied = buckets[par].filter((r) => r.value === row.value).length > 1;
    });
  });

  return [
    { key: "par-3-scoring-nett", title: "Par 3 Scoring - Nett", columnLabel: "TO PAR", rows: buckets[3] },
    { key: "par-4-scoring-nett", title: "Par 4 Scoring - Nett", columnLabel: "TO PAR", rows: buckets[4] },
    { key: "par-5-scoring-nett", title: "Par 5 Scoring - Nett", columnLabel: "TO PAR", rows: buckets[5] },
  ];
}
