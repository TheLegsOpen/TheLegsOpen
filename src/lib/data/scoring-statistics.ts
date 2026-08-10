import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { getActiveChampionship } from "@/lib/data/scorecards";
import { mapPlayer } from "@/lib/data/players";
import { allocateStrokes } from "@/lib/scoring";
import { formatToPar } from "@/lib/leaderboard";
import type { StatCategory, StatRow } from "@/lib/statistics";
import type { Player } from "@/types/player";
import type { Player as PayloadPlayer, Venue } from "@/payload-types";

export type ScoringMode = "nett" | "scratch";

interface HoleInfo {
  par: number;
  si: number;
  yards?: number;
}

export interface HoleToughnessRow {
  holeNumber: number;
  par: number;
  yards?: number;
  average?: number;
  relativeToPar?: number;
  eagleOrBetter: number;
  birdie: number;
  parCount: number;
  bogey: number;
  doubleBogey: number;
  doubleBogeyPlus: number;
  position?: number;
  tied?: boolean;
}

interface PlayerHoleScores {
  player: Player;
  scoreByHole: (number | undefined)[];
}

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

/** Fetches every scorecard for the given (or, if omitted, the active) championship and reduces it to each player's per-hole nett or scratch score. */
async function getPlayerScoresByMode(
  mode: ScoringMode,
  championshipId?: string,
): Promise<{ holeInfos: HoleInfo[]; playerScores: PlayerHoleScores[] }> {
  const payload = await getPayload({ config: configPromise });
  const championship = championshipId
    ? await payload.findByID({ collection: "championships", id: championshipId }).catch(() => undefined)
    : await getActiveChampionship(payload);
  if (!championship) return { holeInfos: [], playerScores: [] };

  const venue = typeof championship.venue === "object" ? (championship.venue as Venue) : undefined;
  const holeInfos = Array.from({ length: 18 }, (_, i) => ({
    par: venue?.holes?.[i]?.par ?? 4,
    si: venue?.holes?.[i]?.si ?? i + 1,
    yards: venue?.holes?.[i]?.yards ?? undefined,
  }));

  const scorecards = await payload.find({
    collection: "scorecards",
    where: { championship: { equals: championship.id } },
    depth: 1,
    limit: 300,
  });

  const playerScores: PlayerHoleScores[] = scorecards.docs.map((doc) => {
    const player = mapPlayer(doc.player as PayloadPlayer);
    const handicap = mode === "nett" ? ((doc.player as PayloadPlayer).championshipHandicap ?? 0) : 0;
    const strokesReceived = allocateStrokes(handicap, holeInfos);
    const scoreByHole = holeInfos.map((_, i) => {
      const strokes = doc.holes?.[i]?.strokes;
      return strokes == null ? undefined : strokes - strokesReceived[i];
    });
    return { player, scoreByHole };
  });

  return { holeInfos, playerScores };
}

/**
 * Real scoring statistics computed directly from Scorecards -- the first family of
 * statistics backed by real data, replacing the old placeholder driving-distance/GIR/putts
 * stats that were never wired to anything. `mode` picks whether the underlying per-hole
 * score is nett (gross minus handicap strokes) or scratch (raw gross, no handicap).
 */
async function getScoringCategories(mode: ScoringMode, championshipId?: string): Promise<StatCategory[]> {
  const { holeInfos, playerScores } = await getPlayerScoresByMode(mode, championshipId);
  if (holeInfos.length === 0) return [];

  const holeFieldAverage = holeInfos.map((_, i) => {
    const values = playerScores.map((p) => p.scoreByHole[i]).filter((v): v is number => v !== undefined);
    if (values.length === 0) return undefined;
    return values.reduce((a, b) => a + b, 0) / values.length;
  });

  const parBuckets: Record<3 | 4 | 5, StatRow[]> = { 3: [], 4: [], 5: [] };
  const birdieOrBetterRows: StatRow[] = [];
  const parCountRows: StatRow[] = [];
  const bogeyOrWorseRows: StatRow[] = [];
  const strokesGainedRows: StatRow[] = [];

  for (const { player, scoreByHole } of playerScores) {
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
      const score = scoreByHole[i];
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

      const fieldAverage = holeFieldAverage[i];
      if (fieldAverage !== undefined) strokesGainedTotal += fieldAverage - score;
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

export async function getNettScoringCategories(championshipId?: string): Promise<StatCategory[]> {
  return getScoringCategories("nett", championshipId);
}

export async function getScratchScoringCategories(championshipId?: string): Promise<StatCategory[]> {
  return getScoringCategories("scratch", championshipId);
}

type StreakKind = "par-or-better" | "par" | "bogey-or-worse";

/** Longest run of consecutive played holes (in hole order) matching the streak's condition. */
function longestStreak(scoreByHole: (number | undefined)[], holeInfos: HoleInfo[], kind: StreakKind): number {
  let longest = 0;
  let current = 0;
  holeInfos.forEach((info, i) => {
    const score = scoreByHole[i];
    if (score == null) {
      current = 0;
      return;
    }
    const relative = score - info.par;
    const matches = kind === "par-or-better" ? relative <= 0 : kind === "par" ? relative === 0 : relative >= 1;
    current = matches ? current + 1 : 0;
    if (current > longest) longest = current;
  });
  return longest;
}

async function getStreakCategoriesForMode(mode: ScoringMode, championshipId?: string): Promise<StatCategory[]> {
  const { holeInfos, playerScores } = await getPlayerScoresByMode(mode, championshipId);
  if (holeInfos.length === 0) return [];

  const parOrBetterRows: StatRow[] = [];
  const parRows: StatRow[] = [];
  const bogeyOrWorseRows: StatRow[] = [];

  for (const { player, scoreByHole } of playerScores) {
    const holesPlayed = scoreByHole.filter((s) => s != null).length;
    if (holesPlayed === 0) continue;

    const parOrBetter = longestStreak(scoreByHole, holeInfos, "par-or-better");
    const parStreak = longestStreak(scoreByHole, holeInfos, "par");
    const bogeyOrWorse = longestStreak(scoreByHole, holeInfos, "bogey-or-worse");

    parOrBetterRows.push({ player, value: parOrBetter, display: String(parOrBetter) });
    parRows.push({ player, value: parStreak, display: String(parStreak) });
    bogeyOrWorseRows.push({ player, value: bogeyOrWorse, display: String(bogeyOrWorse) });
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

export async function getStreakCategories(championshipId?: string): Promise<StatCategory[]> {
  const [nett, scratch] = await Promise.all([
    getStreakCategoriesForMode("nett", championshipId),
    getStreakCategoriesForMode("scratch", championshipId),
  ]);
  return [...nett, ...scratch];
}

/**
 * Toughest Holes, modelled on the PGA Tour's course stats page -- one row per hole (not per
 * player), ranked by average score relative to par. Holes nobody has played yet still show up
 * (with the course setup data) but sort to the bottom, unranked, until scores start coming in.
 */
export async function getToughestHoles(mode: ScoringMode, championshipId?: string): Promise<HoleToughnessRow[]> {
  const { holeInfos, playerScores } = await getPlayerScoresByMode(mode, championshipId);
  if (holeInfos.length === 0) return [];

  const rows: HoleToughnessRow[] = holeInfos.map((info, i) => {
    const scores = playerScores.map((p) => p.scoreByHole[i]).filter((v): v is number => v !== undefined);
    let eagleOrBetter = 0;
    let birdie = 0;
    let parCount = 0;
    let bogey = 0;
    let doubleBogey = 0;
    let doubleBogeyPlus = 0;

    scores.forEach((score) => {
      const relative = score - info.par;
      if (relative <= -2) eagleOrBetter += 1;
      else if (relative === -1) birdie += 1;
      else if (relative === 0) parCount += 1;
      else if (relative === 1) bogey += 1;
      else if (relative === 2) doubleBogey += 1;
      else doubleBogeyPlus += 1;
    });

    const average = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : undefined;

    return {
      holeNumber: i + 1,
      par: info.par,
      yards: info.yards,
      average,
      relativeToPar: average !== undefined ? average - info.par : undefined,
      eagleOrBetter,
      birdie,
      parCount,
      bogey,
      doubleBogey,
      doubleBogeyPlus,
    };
  });

  const played = rows.filter((r) => r.relativeToPar !== undefined).sort((a, b) => (b.relativeToPar ?? 0) - (a.relativeToPar ?? 0));
  const unplayed = rows.filter((r) => r.relativeToPar === undefined).sort((a, b) => a.holeNumber - b.holeNumber);

  let position = 0;
  played.forEach((row, index) => {
    if (index === 0 || row.relativeToPar !== played[index - 1].relativeToPar) position = index + 1;
    row.position = position;
    row.tied = played.filter((r) => r.relativeToPar === row.relativeToPar).length > 1;
  });

  return [...played, ...unplayed];
}

interface PlayerSkillHoles {
  player: Player;
  fairwayHitByHole: (boolean | undefined)[];
  girByHole: (boolean | undefined)[];
  puttsByHole: (number | undefined)[];
}

/**
 * Fairway/GIR/putts are raw per-hole facts entered separately from the strokes grid (optional,
 * via the standard Payload scorecard edit screen) -- unlike strokes they don't depend on
 * handicap, so there's no nett/scratch split here.
 */
async function getPlayerSkillHoles(championshipId?: string): Promise<{ holeInfos: HoleInfo[]; players: PlayerSkillHoles[] }> {
  const payload = await getPayload({ config: configPromise });
  const championship = championshipId
    ? await payload.findByID({ collection: "championships", id: championshipId }).catch(() => undefined)
    : await getActiveChampionship(payload);
  if (!championship) return { holeInfos: [], players: [] };

  const venue = typeof championship.venue === "object" ? (championship.venue as Venue) : undefined;
  const holeInfos = Array.from({ length: 18 }, (_, i) => ({ par: venue?.holes?.[i]?.par ?? 4, si: venue?.holes?.[i]?.si ?? i + 1 }));

  const scorecards = await payload.find({
    collection: "scorecards",
    where: { championship: { equals: championship.id } },
    depth: 1,
    limit: 300,
  });

  const players = scorecards.docs.map((doc) => {
    const player = mapPlayer(doc.player as PayloadPlayer);
    const fairwayHitByHole = holeInfos.map((_, i) => (doc.holes?.[i]?.strokes != null ? Boolean(doc.holes[i]?.fairwayHit) : undefined));
    const girByHole = holeInfos.map((_, i) => (doc.holes?.[i]?.strokes != null ? Boolean(doc.holes[i]?.greenInRegulation) : undefined));
    const puttsByHole = holeInfos.map((_, i) => (doc.holes?.[i]?.strokes != null ? (doc.holes[i]?.putts ?? undefined) : undefined));
    return { player, fairwayHitByHole, girByHole, puttsByHole };
  });

  return { holeInfos, players };
}

/** Field-average-relative "strokes gained" for a rate stat (fairways hit, GIR) where a higher raw value is better. */
function ratedStrokesGained(
  players: PlayerSkillHoles[],
  holeIndices: number[],
  pick: (p: PlayerSkillHoles, i: number) => boolean | undefined,
): StatRow[] {
  const fieldAverageByHole = holeIndices.map((i) => {
    const values = players.map((p) => pick(p, i)).filter((v): v is boolean => v !== undefined).map((v): number => (v ? 1 : 0));
    if (values.length === 0) return undefined;
    return values.reduce((a, b) => a + b, 0) / values.length;
  });

  const rows: StatRow[] = [];
  players.forEach((p) => {
    let gainedTotal = 0;
    let counted = 0;
    holeIndices.forEach((holeIdx, i) => {
      const value = pick(p, holeIdx);
      const fieldAverage = fieldAverageByHole[i];
      if (value === undefined || fieldAverage === undefined) return;
      gainedTotal += (value ? 1 : 0) - fieldAverage;
      counted += 1;
    });
    if (counted > 0) rows.push({ player: p.player, value: -gainedTotal, display: formatDecimalToPar(gainedTotal) });
  });

  rows.sort((a, b) => a.value - b.value);
  assignPositions(rows);
  return rows;
}

function rateRows(players: PlayerSkillHoles[], holeIndices: number[], pick: (p: PlayerSkillHoles, i: number) => boolean | undefined): StatRow[] {
  const rows: StatRow[] = [];
  players.forEach((p) => {
    let hit = 0;
    let attempts = 0;
    holeIndices.forEach((i) => {
      const value = pick(p, i);
      if (value === undefined) return;
      attempts += 1;
      if (value) hit += 1;
    });
    if (attempts > 0) rows.push({ player: p.player, value: hit / attempts, display: `${hit}/${attempts}` });
  });
  rows.sort((a, b) => b.value - a.value);
  assignPositions(rows);
  return rows;
}

export async function getDrivingCategories(championshipId?: string): Promise<StatCategory[]> {
  const { holeInfos, players } = await getPlayerSkillHoles(championshipId);
  if (holeInfos.length === 0) return [];

  // Fairways aren't a meaningful concept on Par 3s, so they're excluded from both the hit-rate and the field average.
  const drivingHoles = holeInfos.map((info, i) => (info.par !== 3 ? i : -1)).filter((i) => i !== -1);

  return [
    { key: "fairways-hit", title: "Fairways Hit", columnLabel: "FAIRWAYS", rows: rateRows(players, drivingHoles, (p, i) => p.fairwayHitByHole[i]) },
    {
      key: "driving-strokes-gained",
      title: "Driving Strokes Gained",
      columnLabel: "TOTAL",
      rows: ratedStrokesGained(players, drivingHoles, (p, i) => p.fairwayHitByHole[i]),
      useParColoring: true,
    },
  ];
}

export async function getApproachCategories(championshipId?: string): Promise<StatCategory[]> {
  const { holeInfos, players } = await getPlayerSkillHoles(championshipId);
  if (holeInfos.length === 0) return [];

  const allHoles = holeInfos.map((_, i) => i);

  return [
    { key: "greens-in-regulation", title: "Greens in Regulation", columnLabel: "GIR", rows: rateRows(players, allHoles, (p, i) => p.girByHole[i]) },
    {
      key: "approach-strokes-gained",
      title: "Approach Strokes Gained",
      columnLabel: "TOTAL",
      rows: ratedStrokesGained(players, allHoles, (p, i) => p.girByHole[i]),
      useParColoring: true,
    },
  ];
}

export async function getPuttingCategories(championshipId?: string): Promise<StatCategory[]> {
  const { holeInfos, players } = await getPlayerSkillHoles(championshipId);
  if (holeInfos.length === 0) return [];

  const puttsRows: StatRow[] = [];
  const strokesGainedRows: StatRow[] = [];

  const fieldAverageByHole = holeInfos.map((_, i) => {
    const values = players.map((p) => p.puttsByHole[i]).filter((v): v is number => v !== undefined);
    if (values.length === 0) return undefined;
    return values.reduce((a, b) => a + b, 0) / values.length;
  });

  players.forEach((p) => {
    let totalPutts = 0;
    let holesCounted = 0;
    let gainedTotal = 0;
    let gainedCounted = 0;
    p.puttsByHole.forEach((putts, i) => {
      if (putts === undefined) return;
      totalPutts += putts;
      holesCounted += 1;
      const fieldAverage = fieldAverageByHole[i];
      if (fieldAverage === undefined) return;
      gainedTotal += fieldAverage - putts;
      gainedCounted += 1;
    });
    if (holesCounted > 0) puttsRows.push({ player: p.player, value: totalPutts, display: String(totalPutts) });
    if (gainedCounted > 0) strokesGainedRows.push({ player: p.player, value: -gainedTotal, display: formatDecimalToPar(gainedTotal) });
  });

  puttsRows.sort((a, b) => a.value - b.value);
  assignPositions(puttsRows);
  strokesGainedRows.sort((a, b) => a.value - b.value);
  assignPositions(strokesGainedRows);

  return [
    { key: "putts", title: "Number of Putts", columnLabel: "TOTAL", rows: puttsRows },
    { key: "putting-strokes-gained", title: "Putting Strokes Gained", columnLabel: "TOTAL", rows: strokesGainedRows, useParColoring: true },
  ];
}
