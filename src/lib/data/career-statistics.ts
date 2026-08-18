import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { getChampionshipHistory } from "@/lib/data/championships";
import { getCompetitionLeaderboardForChampionshipId } from "@/lib/data/scorecards";
import { isConcluded, formatToPar } from "@/lib/leaderboard";
import { mapPlayer } from "@/lib/data/players";
import { allocateStrokes } from "@/lib/scoring";
import { assignPositions, formatDecimalToPar, longestStreak, type ScoringMode } from "@/lib/data/scoring-statistics";
import type { StatCategory, StatRow } from "@/lib/statistics";
import type { Player } from "@/types/player";
import type { Player as PayloadPlayer, Venue as PayloadVenue, Scorecard as PayloadScorecard } from "@/payload-types";

/**
 * Career-scoped versions of the per-event stat categories in scoring-statistics.ts -- same
 * StatCategory/StatRow shape (so PlayerStatPanel needs no changes), pooled across every
 * championship a player has real, trustworthy scorecard data for, instead of just one event.
 */

interface HoleInfo {
  par: number;
  si: number;
}

/** Same eligibility rule as getPlayerResults: only a fully concluded year's real scores are trustworthy to pool. */
async function getTrustedChampionshipIds(): Promise<string[]> {
  const history = await getChampionshipHistory();
  const played = history.filter((c) => c.winnerName);
  const checked = await Promise.all(
    played.map(async (c) => {
      const main = await getCompetitionLeaderboardForChampionshipId(c.id, "main");
      return isConcluded(main) ? c.id : undefined;
    }),
  );
  return checked.filter((id): id is string => Boolean(id));
}

interface CareerInputs {
  holeInfosByChampionship: Map<string, HoleInfo[]>;
  scorecardsByChampionship: Map<string, PayloadScorecard[]>;
}

/** Two batched queries covering every trusted year at once, rather than one query per year. */
async function loadCareerInputs(): Promise<CareerInputs> {
  const trustedIds = await getTrustedChampionshipIds();
  if (trustedIds.length === 0) return { holeInfosByChampionship: new Map(), scorecardsByChampionship: new Map() };

  const payload = await getPayload({ config: configPromise });
  const [championships, scorecards] = await Promise.all([
    payload.find({ collection: "championships", where: { id: { in: trustedIds } }, limit: trustedIds.length }),
    payload.find({ collection: "scorecards", where: { championship: { in: trustedIds } }, depth: 1, limit: 2000 }),
  ]);

  const holeInfosByChampionship = new Map<string, HoleInfo[]>(
    championships.docs.map((doc) => {
      const venue = typeof doc.venue === "object" ? (doc.venue as PayloadVenue) : undefined;
      const holeInfos = Array.from({ length: 18 }, (_, i) => ({ par: venue?.holes?.[i]?.par ?? 4, si: venue?.holes?.[i]?.si ?? i + 1 }));
      return [String(doc.id), holeInfos];
    }),
  );

  const scorecardsByChampionship = new Map<string, PayloadScorecard[]>();
  for (const doc of scorecards.docs) {
    const championshipId = String(typeof doc.championship === "object" ? doc.championship.id : doc.championship);
    const list = scorecardsByChampionship.get(championshipId);
    if (list) list.push(doc);
    else scorecardsByChampionship.set(championshipId, [doc]);
  }

  return { holeInfosByChampionship, scorecardsByChampionship };
}

interface PlayerYearScores {
  player: Player;
  championshipId: string;
  scoreByHole: (number | undefined)[];
}

function scoresForMode(mode: ScoringMode, inputs: CareerInputs): PlayerYearScores[] {
  const out: PlayerYearScores[] = [];
  for (const [championshipId, docs] of inputs.scorecardsByChampionship) {
    const holeInfos = inputs.holeInfosByChampionship.get(championshipId) ?? [];
    for (const doc of docs) {
      const payloadPlayer = doc.player as PayloadPlayer;
      const player = mapPlayer(payloadPlayer);
      const handicap = mode === "nett" ? (payloadPlayer.championshipHandicap ?? 0) : 0;
      const strokesReceived = allocateStrokes(handicap, holeInfos);
      const scoreByHole = holeInfos.map((_, i) => {
        const strokes = doc.holes?.[i]?.strokes;
        return strokes == null ? undefined : strokes - strokesReceived[i];
      });
      out.push({ player, championshipId, scoreByHole });
    }
  }
  return out;
}

function groupByPlayer<T extends { player: Player }>(items: T[]): Map<string, { player: Player; entries: T[] }> {
  const byPlayer = new Map<string, { player: Player; entries: T[] }>();
  for (const item of items) {
    const bucket = byPlayer.get(item.player.id);
    if (bucket) bucket.entries.push(item);
    else byPlayer.set(item.player.id, { player: item.player, entries: [item] });
  }
  return byPlayer;
}

/** Field average of the raw score value, computed per (championship, hole) -- never averaged across different courses/years. */
function fieldAverageByChampionship(scores: PlayerYearScores[], holeInfosByChampionship: Map<string, HoleInfo[]>): Map<string, (number | undefined)[]> {
  const byChampionship = new Map<string, PlayerYearScores[]>();
  for (const s of scores) {
    const list = byChampionship.get(s.championshipId);
    if (list) list.push(s);
    else byChampionship.set(s.championshipId, [s]);
  }
  const result = new Map<string, (number | undefined)[]>();
  for (const [championshipId, group] of byChampionship) {
    const holeInfos = holeInfosByChampionship.get(championshipId) ?? [];
    const averages = holeInfos.map((_, i) => {
      const values = group.map((s) => s.scoreByHole[i]).filter((v): v is number => v !== undefined);
      return values.length === 0 ? undefined : values.reduce((a, b) => a + b, 0) / values.length;
    });
    result.set(championshipId, averages);
  }
  return result;
}

async function getCareerScoringCategories(mode: ScoringMode): Promise<StatCategory[]> {
  const inputs = await loadCareerInputs();
  const scores = scoresForMode(mode, inputs);
  if (scores.length === 0) return [];

  const fieldAverages = fieldAverageByChampionship(scores, inputs.holeInfosByChampionship);

  const parBuckets: Record<3 | 4 | 5, StatRow[]> = { 3: [], 4: [], 5: [] };
  const birdieOrBetterRows: StatRow[] = [];
  const parCountRows: StatRow[] = [];
  const bogeyOrWorseRows: StatRow[] = [];
  const strokesGainedRows: StatRow[] = [];

  for (const { player, entries } of groupByPlayer(scores).values()) {
    const parTotals: Record<3 | 4 | 5, { sum: number; count: number }> = { 3: { sum: 0, count: 0 }, 4: { sum: 0, count: 0 }, 5: { sum: 0, count: 0 } };
    let birdieOrBetterCount = 0;
    let parCount = 0;
    let bogeyOrWorseCount = 0;
    let strokesGainedTotal = 0;
    let holesPlayed = 0;

    for (const entry of entries) {
      const holeInfos = inputs.holeInfosByChampionship.get(entry.championshipId) ?? [];
      const fieldAverage = fieldAverages.get(entry.championshipId) ?? [];

      holeInfos.forEach((info, i) => {
        const score = entry.scoreByHole[i];
        if (score == null) return;
        holesPlayed += 1;

        const relative = score - info.par;
        const par = info.par as 3 | 4 | 5;
        if (par === 3 || par === 4 || par === 5) {
          parTotals[par].sum += relative;
          parTotals[par].count += 1;
        }

        if (relative <= -1) birdieOrBetterCount += 1;
        else if (relative === 0) parCount += 1;
        else bogeyOrWorseCount += 1;

        const average = fieldAverage[i];
        if (average !== undefined) strokesGainedTotal += average - score;
      });
    }

    ([3, 4, 5] as const).forEach((par) => {
      const { sum, count } = parTotals[par];
      if (count === 0) return;
      parBuckets[par].push({ player, value: sum, display: formatToPar(sum) });
    });

    if (holesPlayed > 0) {
      birdieOrBetterRows.push({ player, value: birdieOrBetterCount, display: String(birdieOrBetterCount) });
      parCountRows.push({ player, value: parCount, display: String(parCount) });
      bogeyOrWorseRows.push({ player, value: bogeyOrWorseCount, display: String(bogeyOrWorseCount) });
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

  const label = mode === "nett" ? "Nett" : "Scratch";
  return [
    { key: `par-3-scoring-${mode}`, title: `Par 3 Scoring - ${label}`, columnLabel: "TOTAL", rows: parBuckets[3], useParColoring: true },
    { key: `par-4-scoring-${mode}`, title: `Par 4 Scoring - ${label}`, columnLabel: "TOTAL", rows: parBuckets[4], useParColoring: true },
    { key: `par-5-scoring-${mode}`, title: `Par 5 Scoring - ${label}`, columnLabel: "TOTAL", rows: parBuckets[5], useParColoring: true },
    { key: `most-birdies-or-better-${mode}`, title: "Most Birdies or Better", columnLabel: "TOTAL", rows: birdieOrBetterRows },
    { key: `most-pars-${mode}`, title: "Most Pars", columnLabel: "TOTAL", rows: parCountRows },
    { key: `most-bogeys-or-worse-${mode}`, title: "Most Bogeys or Worse", columnLabel: "TOTAL", rows: bogeyOrWorseRows },
    { key: `strokes-gained-${mode}`, title: "Strokes Gained", columnLabel: "TOTAL", rows: strokesGainedRows, useParColoring: true },
  ];
}

export async function getCareerNettScoringCategories(): Promise<StatCategory[]> {
  return getCareerScoringCategories("nett");
}

export async function getCareerScratchScoringCategories(): Promise<StatCategory[]> {
  return getCareerScoringCategories("scratch");
}

async function getCareerStreakCategoriesForMode(mode: ScoringMode): Promise<StatCategory[]> {
  const inputs = await loadCareerInputs();
  const scores = scoresForMode(mode, inputs);
  if (scores.length === 0) return [];

  const parOrBetterRows: StatRow[] = [];
  const parRows: StatRow[] = [];
  const bogeyOrWorseRows: StatRow[] = [];

  for (const { player, entries } of groupByPlayer(scores).values()) {
    let bestParOrBetter = 0;
    let bestPar = 0;
    let bestBogeyOrWorse = 0;
    let holesPlayed = 0;

    for (const entry of entries) {
      const holeInfos = inputs.holeInfosByChampionship.get(entry.championshipId) ?? [];
      holesPlayed += entry.scoreByHole.filter((s) => s != null).length;
      // A streak can't span two different rounds -- each year's best run stands on its own, and a
      // player's career figure is simply the best of those, not a run concatenated across years.
      bestParOrBetter = Math.max(bestParOrBetter, longestStreak(entry.scoreByHole, holeInfos, "par-or-better"));
      bestPar = Math.max(bestPar, longestStreak(entry.scoreByHole, holeInfos, "par"));
      bestBogeyOrWorse = Math.max(bestBogeyOrWorse, longestStreak(entry.scoreByHole, holeInfos, "bogey-or-worse"));
    }

    if (holesPlayed === 0) continue;
    parOrBetterRows.push({ player, value: bestParOrBetter, display: String(bestParOrBetter) });
    parRows.push({ player, value: bestPar, display: String(bestPar) });
    bogeyOrWorseRows.push({ player, value: bestBogeyOrWorse, display: String(bestBogeyOrWorse) });
  }

  [parOrBetterRows, parRows, bogeyOrWorseRows].forEach((rows) => {
    rows.sort((a, b) => b.value - a.value);
    assignPositions(rows);
  });

  const label = mode === "nett" ? "Nett" : "Scratch";
  return [
    { key: `longest-par-or-better-streak-${mode}`, title: `Longest ${label} Par or Better Streak`, columnLabel: "TOTAL", rows: parOrBetterRows },
    { key: `longest-par-streak-${mode}`, title: `Longest ${label} Par Streak`, columnLabel: "TOTAL", rows: parRows },
    { key: `longest-bogey-or-worse-streak-${mode}`, title: `Longest ${label} Bogey or Worse Streak`, columnLabel: "TOTAL", rows: bogeyOrWorseRows },
  ];
}

export async function getCareerStreakCategories(): Promise<StatCategory[]> {
  const [nett, scratch] = await Promise.all([getCareerStreakCategoriesForMode("nett"), getCareerStreakCategoriesForMode("scratch")]);
  return [...nett, ...scratch];
}

interface PlayerSkillEntry {
  player: Player;
  championshipId: string;
  fairwayHitByHole: (boolean | undefined)[];
  girByHole: (boolean | undefined)[];
  puttsByHole: (number | undefined)[];
}

function skillEntries(inputs: CareerInputs): PlayerSkillEntry[] {
  const out: PlayerSkillEntry[] = [];
  for (const [championshipId, docs] of inputs.scorecardsByChampionship) {
    const holeInfos = inputs.holeInfosByChampionship.get(championshipId) ?? [];
    for (const doc of docs) {
      const player = mapPlayer(doc.player as PayloadPlayer);
      const fairwayHitByHole = holeInfos.map((_, i) => (doc.holes?.[i]?.strokes != null ? Boolean(doc.holes[i]?.fairwayHit) : undefined));
      const girByHole = holeInfos.map((_, i) => (doc.holes?.[i]?.strokes != null ? Boolean(doc.holes[i]?.greenInRegulation) : undefined));
      const puttsByHole = holeInfos.map((_, i) => (doc.holes?.[i]?.strokes != null ? (doc.holes[i]?.putts ?? undefined) : undefined));
      out.push({ player, championshipId, fairwayHitByHole, girByHole, puttsByHole });
    }
  }
  return out;
}

/**
 * Shared hit-rate + field-average-relative "strokes gained" aggregation for a boolean per-hole
 * stat (fairways hit, greens in regulation). `holeIndicesFn` returns the relevant hole subset for
 * a given year (all 18 for GIR, that year's own non-par-3 holes for driving) -- resolved per
 * championship since which holes are par 3 varies by course.
 */
function buildRateAndGainedRows(
  entries: PlayerSkillEntry[],
  holeIndicesFn: (championshipId: string) => number[],
  pick: (entry: PlayerSkillEntry, holeIndex: number) => boolean | undefined,
): { rateRows: StatRow[]; strokesGainedRows: StatRow[] } {
  const byChampionship = new Map<string, PlayerSkillEntry[]>();
  for (const e of entries) {
    const list = byChampionship.get(e.championshipId);
    if (list) list.push(e);
    else byChampionship.set(e.championshipId, [e]);
  }

  const fieldRateByChampionship = new Map<string, Map<number, number>>();
  for (const [championshipId, group] of byChampionship) {
    const rateByHole = new Map<number, number>();
    holeIndicesFn(championshipId).forEach((i) => {
      const values = group
        .map((e) => pick(e, i))
        .filter((v): v is boolean => v !== undefined)
        .map((v): number => (v ? 1 : 0));
      if (values.length > 0) rateByHole.set(i, values.reduce((a, b) => a + b, 0) / values.length);
    });
    fieldRateByChampionship.set(championshipId, rateByHole);
  }

  const rateRows: StatRow[] = [];
  const strokesGainedRows: StatRow[] = [];

  for (const { player, entries: playerEntries } of groupByPlayer(entries).values()) {
    let hit = 0;
    let attempts = 0;
    let gainedTotal = 0;
    let gainedCounted = 0;

    for (const e of playerEntries) {
      const rateByHole = fieldRateByChampionship.get(e.championshipId) ?? new Map<number, number>();
      holeIndicesFn(e.championshipId).forEach((i) => {
        const value = pick(e, i);
        if (value === undefined) return;
        attempts += 1;
        if (value) hit += 1;
        const average = rateByHole.get(i);
        if (average === undefined) return;
        gainedTotal += (value ? 1 : 0) - average;
        gainedCounted += 1;
      });
    }

    if (attempts > 0) rateRows.push({ player, value: hit / attempts, display: `${hit}/${attempts}` });
    if (gainedCounted > 0) strokesGainedRows.push({ player, value: -gainedTotal, display: formatDecimalToPar(gainedTotal) });
  }

  rateRows.sort((a, b) => b.value - a.value);
  assignPositions(rateRows);
  strokesGainedRows.sort((a, b) => a.value - b.value);
  assignPositions(strokesGainedRows);

  return { rateRows, strokesGainedRows };
}

export async function getCareerDrivingCategories(): Promise<StatCategory[]> {
  const inputs = await loadCareerInputs();
  const entries = skillEntries(inputs);
  if (entries.length === 0) return [];

  // Fairways aren't a meaningful concept on Par 3s -- excluded using that year's own venue, since which holes are par 3 varies by course.
  const drivingHoles = (championshipId: string) =>
    (inputs.holeInfosByChampionship.get(championshipId) ?? []).map((info, i) => (info.par !== 3 ? i : -1)).filter((i) => i !== -1);

  const { rateRows, strokesGainedRows } = buildRateAndGainedRows(entries, drivingHoles, (e, i) => e.fairwayHitByHole[i]);

  return [
    { key: "fairways-hit", title: "Fairways Hit", columnLabel: "FAIRWAYS", rows: rateRows },
    { key: "driving-strokes-gained", title: "Driving Strokes Gained", columnLabel: "TOTAL", rows: strokesGainedRows, useParColoring: true },
  ];
}

export async function getCareerApproachCategories(): Promise<StatCategory[]> {
  const inputs = await loadCareerInputs();
  const entries = skillEntries(inputs);
  if (entries.length === 0) return [];

  const allHoles = (championshipId: string) => (inputs.holeInfosByChampionship.get(championshipId) ?? []).map((_, i) => i);
  const { rateRows, strokesGainedRows } = buildRateAndGainedRows(entries, allHoles, (e, i) => e.girByHole[i]);

  return [
    { key: "greens-in-regulation", title: "Greens in Regulation", columnLabel: "GIR", rows: rateRows },
    { key: "approach-strokes-gained", title: "Approach Strokes Gained", columnLabel: "TOTAL", rows: strokesGainedRows, useParColoring: true },
  ];
}

export async function getCareerPuttingCategories(): Promise<StatCategory[]> {
  const inputs = await loadCareerInputs();
  const entries = skillEntries(inputs);
  if (entries.length === 0) return [];

  const byChampionship = new Map<string, PlayerSkillEntry[]>();
  for (const e of entries) {
    const list = byChampionship.get(e.championshipId);
    if (list) list.push(e);
    else byChampionship.set(e.championshipId, [e]);
  }
  const fieldAverageByChampionshipHole = new Map<string, (number | undefined)[]>();
  for (const [championshipId, group] of byChampionship) {
    const holeInfos = inputs.holeInfosByChampionship.get(championshipId) ?? [];
    const averages = holeInfos.map((_, i) => {
      const values = group.map((e) => e.puttsByHole[i]).filter((v): v is number => v !== undefined);
      return values.length === 0 ? undefined : values.reduce((a, b) => a + b, 0) / values.length;
    });
    fieldAverageByChampionshipHole.set(championshipId, averages);
  }

  const puttsRows: StatRow[] = [];
  const strokesGainedRows: StatRow[] = [];

  for (const { player, entries: playerEntries } of groupByPlayer(entries).values()) {
    let totalPutts = 0;
    let holesCounted = 0;
    let gainedTotal = 0;
    let gainedCounted = 0;

    for (const e of playerEntries) {
      const fieldAverage = fieldAverageByChampionshipHole.get(e.championshipId) ?? [];
      e.puttsByHole.forEach((putts, i) => {
        if (putts === undefined) return;
        totalPutts += putts;
        holesCounted += 1;
        const average = fieldAverage[i];
        if (average === undefined) return;
        gainedTotal += average - putts;
        gainedCounted += 1;
      });
    }

    if (holesCounted > 0) puttsRows.push({ player, value: totalPutts, display: String(totalPutts) });
    if (gainedCounted > 0) strokesGainedRows.push({ player, value: -gainedTotal, display: formatDecimalToPar(gainedTotal) });
  }

  puttsRows.sort((a, b) => a.value - b.value);
  assignPositions(puttsRows);
  strokesGainedRows.sort((a, b) => a.value - b.value);
  assignPositions(strokesGainedRows);

  return [
    { key: "putts", title: "Number of Putts", columnLabel: "TOTAL", rows: puttsRows },
    { key: "putting-strokes-gained", title: "Putting Strokes Gained", columnLabel: "TOTAL", rows: strokesGainedRows, useParColoring: true },
  ];
}
