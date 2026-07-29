import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { getActiveChampionship } from "@/lib/data/scorecards";
import { mapPlayer } from "@/lib/data/players";
import { allocateStrokes } from "@/lib/scoring";
import { formatToPar } from "@/lib/leaderboard";
import type { StatCategory, StatRow } from "@/lib/statistics";
import type { Player } from "@/types/player";
import type { Player as PayloadPlayer, Venue } from "@/payload-types";

/** Strokes Gained is the only stat here with genuine fractional values (field averages are rarely whole numbers). */
function formatDecimalToPar(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  if (rounded === 0) return "E";
  const fixed = Math.abs(rounded).toFixed(2);
  return rounded > 0 ? `+${fixed}` : `-${fixed}`;
}

/** Assigns tie-aware rank (1st, 2nd, T2nd...) to an already-sorted (best-first) row list. */
function assignPositions(rows: StatRow[]): void {
  let position = 0;
  rows.forEach((row, index) => {
    if (index === 0 || row.value !== rows[index - 1].value) position = index + 1;
    row.position = position;
    row.tied = rows.filter((r) => r.value === row.value).length > 1;
  });
}

/**
 * Real scoring statistics computed directly from Scorecards -- the first family of
 * statistics backed by real data, replacing the old placeholder driving-distance/GIR/putts
 * stats that were never wired to anything.
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

  // First pass: nett score per player per hole, so we can compute each hole's field average
  // before working out any individual player's Strokes Gained.
  const playerNetts: { player: Player; nettByHole: (number | undefined)[] }[] = scorecards.docs.map((doc) => {
    const player = mapPlayer(doc.player as PayloadPlayer);
    const handicap = (doc.player as PayloadPlayer).championshipHandicap ?? 0;
    const strokesReceived = allocateStrokes(handicap, holeInfos);
    const nettByHole = holeInfos.map((_, i) => {
      const strokes = doc.holes?.[i]?.strokes;
      return strokes == null ? undefined : strokes - strokesReceived[i];
    });
    return { player, nettByHole };
  });

  const holeFieldAverage = holeInfos.map((_, i) => {
    const values = playerNetts.map((p) => p.nettByHole[i]).filter((v): v is number => v !== undefined);
    if (values.length === 0) return undefined;
    return values.reduce((a, b) => a + b, 0) / values.length;
  });

  const parBuckets: Record<3 | 4 | 5, StatRow[]> = { 3: [], 4: [], 5: [] };
  const birdieOrBetterRows: StatRow[] = [];
  const parCountRows: StatRow[] = [];
  const bogeyOrWorseRows: StatRow[] = [];
  const strokesGainedRows: StatRow[] = [];

  for (const { player, nettByHole } of playerNetts) {
    const parTotals: Record<3 | 4 | 5, { sum: number; count: number }> = {
      3: { sum: 0, count: 0 },
      4: { sum: 0, count: 0 },
      5: { sum: 0, count: 0 },
    };
    let birdieOrBetterCount = 0;
    let parCount = 0;
    let bogeyOrWorseCount = 0;
    let strokesGainedTotal = 0;
    let holesPlayed = 0;

    holeInfos.forEach((info, i) => {
      const nett = nettByHole[i];
      if (nett == null) return;
      holesPlayed += 1;

      const relative = nett - info.par;
      const par = info.par as 3 | 4 | 5;
      if (par === 3 || par === 4 || par === 5) {
        parTotals[par].sum += relative;
        parTotals[par].count += 1;
      }

      if (relative <= -1) birdieOrBetterCount += 1;
      else if (relative === 0) parCount += 1;
      else bogeyOrWorseCount += 1;

      const fieldAverage = holeFieldAverage[i];
      if (fieldAverage !== undefined) strokesGainedTotal += fieldAverage - nett;
    });

    ([3, 4, 5] as const).forEach((par) => {
      const { sum, count } = parTotals[par];
      if (count === 0) return;
      parBuckets[par].push({ player, value: sum, display: formatToPar(sum) });
    });

    if (holesPlayed > 0) {
      birdieOrBetterRows.push({ player, value: birdieOrBetterCount, display: String(birdieOrBetterCount) });
      parCountRows.push({ player, value: parCount, display: String(parCount) });
      bogeyOrWorseRows.push({ player, value: bogeyOrWorseCount, display: String(bogeyOrWorseCount) });
      // Stored negated so ascending sort (matching every other category here) still ranks best-first,
      // and scorePillClass's under/level/over colouring reads correctly (gained shots = "under par" = red).
      strokesGainedRows.push({ player, value: -strokesGainedTotal, display: formatDecimalToPar(strokesGainedTotal) });
    }
  }

  ([3, 4, 5] as const).forEach((par) => {
    parBuckets[par].sort((a, b) => a.value - b.value);
    assignPositions(parBuckets[par]);
  });

  birdieOrBetterRows.sort((a, b) => b.value - a.value);
  assignPositions(birdieOrBetterRows);
  parCountRows.sort((a, b) => b.value - a.value);
  assignPositions(parCountRows);
  bogeyOrWorseRows.sort((a, b) => b.value - a.value);
  assignPositions(bogeyOrWorseRows);
  strokesGainedRows.sort((a, b) => a.value - b.value);
  assignPositions(strokesGainedRows);

  return [
    { key: "par-3-scoring-nett", title: "Par 3 Scoring - Nett", columnLabel: "TOTAL", rows: parBuckets[3], useParColoring: true },
    { key: "par-4-scoring-nett", title: "Par 4 Scoring - Nett", columnLabel: "TOTAL", rows: parBuckets[4], useParColoring: true },
    { key: "par-5-scoring-nett", title: "Par 5 Scoring - Nett", columnLabel: "TOTAL", rows: parBuckets[5], useParColoring: true },
    { key: "most-birdies-or-better", title: "Most Birdies or Better", columnLabel: "TOTAL", rows: birdieOrBetterRows },
    { key: "most-pars", title: "Most Pars", columnLabel: "TOTAL", rows: parCountRows },
    { key: "most-bogeys-or-worse", title: "Most Bogeys or Worse", columnLabel: "TOTAL", rows: bogeyOrWorseRows },
    { key: "strokes-gained", title: "Strokes Gained", columnLabel: "TOTAL", rows: strokesGainedRows, useParColoring: true },
  ];
}
