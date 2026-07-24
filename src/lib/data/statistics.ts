import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { mapPlayer } from "@/lib/data/players";
import { formatToPar } from "@/lib/leaderboard";
import type { StatCategory, StatRow } from "@/lib/statistics";
import type { Player as PayloadPlayer } from "@/payload-types";

/**
 * Data-access seam for player statistics — now backed by the
 * PlayerStatistics collection in Payload/Postgres rather than synthesized
 * placeholder values. Builds the same StatCategory[] shape the Statistics
 * page already consumes, so no component changes were needed.
 */
export async function getStatCategories(): Promise<StatCategory[]> {
  const payload = await getPayload({ config: configPromise });
  const result = await payload.find({ collection: "player-statistics", depth: 1, limit: 200 });

  const rows = result.docs.map((doc) => ({
    player: mapPlayer(doc.player as PayloadPlayer),
    drivingDistanceYards: doc.drivingDistanceYards,
    greensInRegulationHit: doc.greensInRegulationHit,
    totalPutts: doc.totalPutts,
    par5ScoringToPar: doc.par5ScoringToPar,
    scramblingPercent: doc.scramblingPercent,
  }));

  const drivingDistance: StatRow[] = rows
    .map((row) => ({ player: row.player, value: row.drivingDistanceYards, display: row.drivingDistanceYards.toFixed(1) }))
    .sort((a, b) => b.value - a.value);

  const greensInRegulation: StatRow[] = rows
    .map((row) => {
      const pct = (row.greensInRegulationHit / 72) * 100;
      return { player: row.player, value: pct, display: `${row.greensInRegulationHit}/72 · ${pct.toFixed(1)}%` };
    })
    .sort((a, b) => b.value - a.value);

  const totalPutts: StatRow[] = rows
    .map((row) => ({ player: row.player, value: row.totalPutts, display: `${row.totalPutts}` }))
    .sort((a, b) => a.value - b.value);

  const par5Scoring: StatRow[] = rows
    .map((row) => ({ player: row.player, value: row.par5ScoringToPar, display: formatToPar(row.par5ScoringToPar) }))
    .sort((a, b) => a.value - b.value);

  const scrambling: StatRow[] = rows
    .map((row) => ({ player: row.player, value: row.scramblingPercent, display: `${row.scramblingPercent.toFixed(1)}%` }))
    .sort((a, b) => b.value - a.value);

  return [
    { key: "driving-distance", title: "Driving Distance", columnLabel: "YDS", rows: drivingDistance },
    { key: "greens-in-regulation", title: "Greens in Regulation", columnLabel: "GIR", rows: greensInRegulation },
    { key: "total-putts", title: "Total Putts", columnLabel: "PUTTS", rows: totalPutts },
    { key: "par-5-scoring", title: "Par 5 Scoring", columnLabel: "TO PAR", rows: par5Scoring },
    { key: "scrambling", title: "Scrambling", columnLabel: "%", rows: scrambling },
  ];
}
