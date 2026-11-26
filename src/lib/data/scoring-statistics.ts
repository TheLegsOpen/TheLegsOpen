import { cache } from "react";
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
  /**
   * True for a hole the player will never score: picked up (marked no return) or left unplayed
   * after withdrawing. Different from a hole simply not reached yet in a live round.
   */
  lostHoles: boolean[];
}

/** Strokes Gained is the only stat here with genuine fractional values (field averages are rarely whole numbers). */
export function formatDecimalToPar(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  if (rounded === 0) return "E";
  const fixed = Math.abs(rounded).toFixed(2);
  return rounded > 0 ? `+${fixed}` : `-${fixed}`;
}

/**
 * PGA Tour's Bounce Back: how often a hole over par is followed by one under par. A chance is an
 * over-par hole with a scored hole after it, so the 18th never counts, and nor does a hole
 * before a pick-up or one not reached yet.
 */
export function bounceBack(scoreByHole: (number | undefined)[], holeInfos: { par: number }[]): { chances: number; bounced: number } {
  return holeAfterHole(scoreByHole, holeInfos, (relative) => relative > 0, (relative) => relative < 0);
}

/** PGA Tour's Reverse Bounce Back: how often a hole under par is followed by one over par. Lower is better. */
export function reverseBounceBack(scoreByHole: (number | undefined)[], holeInfos: { par: number }[]): { chances: number; bounced: number } {
  return holeAfterHole(scoreByHole, holeInfos, (relative) => relative < 0, (relative) => relative > 0);
}

/** Counts the scored holes matching `first` that have a scored hole after them, and how many of those were followed by one matching `then`. */
function holeAfterHole(
  scoreByHole: (number | undefined)[],
  holeInfos: { par: number }[],
  first: (relative: number) => boolean,
  then: (relative: number) => boolean,
): { chances: number; bounced: number } {
  let chances = 0;
  let bounced = 0;
  for (let i = 0; i < holeInfos.length - 1; i++) {
    const score = scoreByHole[i];
    const next = scoreByHole[i + 1];
    if (score == null || next == null || !holeInfos[i + 1] || !first(score - holeInfos[i].par)) continue;
    chances += 1;
    if (then(next - holeInfos[i + 1].par)) bounced += 1;
  }
  return { chances, bounced };
}

/**
 * A percentage row (Bounce Back, Birdie or Better %, Bogey Avoidance): shown to one decimal with
 * the count behind it, and ranked on that same rounded figure. Whole numbers made 1/12 and 1/13
 * both read 8% while ranked apart; ranking on the rounded figure means two rates that read the
 * same on the page always share a place, even across a career's worth of holes.
 */
/**
 * Ranks a rate table on only the players with at least `minimum` chances; the rest follow, in the
 * same order, without a place. Without it a player who went over par once and parred the next led
 * Bounce Back on 1/1, and one with a single birdie led Reverse Bounce Back on 0/1.
 */
export function rankRates(entries: { row: StatRow; chances: number }[], minimum: number, order: "high" | "low"): StatRow[] {
  const byRate = (a: StatRow, b: StatRow) => (order === "high" ? b.value - a.value : a.value - b.value);
  const ranked = entries.filter((e) => e.chances >= minimum).map((e) => e.row).sort(byRate);
  assignPositions(ranked);
  const unranked = entries.filter((e) => e.chances < minimum).map((e) => ({ ...e.row, unranked: true })).sort(byRate);
  return [...ranked, ...unranked];
}

/** Bounce Back chances needed to be ranked in one championship's tables. */
export const BOUNCE_BACK_MINIMUM = 5;
export const REVERSE_BOUNCE_BACK_MINIMUM = 3;

export function bounceBackNote(minimum: number): string {
  return `Ranked from ${minimum} chances. Players with fewer follow the ranked ones, marked —.`;
}

export function percentageRow(player: Player, count: number, total: number): StatRow {
  const percent = Math.round((count / total) * 1000) / 10;
  return { player, value: percent, display: `${percent.toFixed(1)}% (${count}/${total})` };
}

/**
 * PGA Tour's Eagles (Holes per): holes played divided by eagles or better, fewest first. Only a
 * player with an eagle has one. Shown to one decimal with the counts, and ranked on that figure.
 */
export function holesPerEagleRow(player: Player, holesPlayed: number, eagles: number): StatRow {
  const perEagle = Math.round((holesPlayed / eagles) * 10) / 10;
  return { player, value: perEagle, display: `${perEagle.toFixed(1)} (${eagles} in ${holesPlayed})` };
}

/**
 * PGA Tour's Birdie to Bogey Ratio: birdies or better divided by bogeys or worse, higher is better.
 * Shown with the counts behind it. A round without a bogey has no ratio to show, so it reads as the
 * count alone and ranks above every ratio, more birdies first. Not Infinity: the career tables are
 * cached as JSON, which would turn it into null.
 */
export function birdieToBogeyRow(player: Player, birdies: number, bogeys: number): StatRow {
  if (bogeys === 0) return { player, value: 1000 + birdies, display: `${birdies} to 0` };
  // Three decimals, not PGA Tour's two: at two, 1 to 12 and 1 to 13 both read 0.08 while ranked apart.
  return { player, value: birdies / bogeys, display: `${(birdies / bogeys).toFixed(3)} (${birdies} to ${bogeys})` };
}

/**
 * A nine's score in relation to par -- holes 1-9 from `start` 0, holes 10-18 from 9 -- or
 * undefined unless every one of those nine holes has a score.
 */
export function nineToPar(scoreByHole: (number | undefined)[], holeInfos: { par: number }[], start: 0 | 9): number | undefined {
  let total = 0;
  for (let i = start; i < start + 9; i++) {
    const score = scoreByHole[i];
    if (score == null || !holeInfos[i]) return undefined;
    total += score - holeInfos[i].par;
  }
  return total;
}

/** Assigns tie-aware rank (1st, 2nd, T2nd...) to an already-sorted (best-first) row list. */
export function assignPositions(rows: StatRow[]): void {
  // Strokes gained is a sum of fractional field averages, so two equal totals can differ in the
  // last binary digit: three players on +2.72 in 2026 read 9th, T10 and T10. Anything closer than
  // this is the same figure.
  const same = (a: number, b: number) => Math.abs(a - b) < 1e-9;
  let position = 0;
  rows.forEach((row, index) => {
    if (index === 0 || !same(row.value, rows[index - 1].value)) position = index + 1;
    row.position = position;
    row.tied = rows.filter((r) => same(r.value, row.value)).length > 1;
  });
}

/**
 * Fetches every scorecard for the given (or, if omitted, the active) championship and reduces it to
 * each player's per-hole nett or scratch score.
 *
 * cache()d per request: the nett, scratch and streak category builders all call this, and pages
 * that show several of those at once (the homepage and /statistics both render six) were otherwise
 * repeating the same 300-scorecard depth-1 query several times per render. Keyed on the arguments,
 * so nett and scratch still fetch separately -- it only collapses the identical repeats.
 */
const getPlayerScoresByMode = cache(async function getPlayerScoresByMode(
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
    // The card's own handicap, not the player's current one. Reading the player meant every nett
    // statistic was recomputed from whatever that figure happens to be today, so setting up a new
    // year silently rewrote finished ones -- Mark Alston's 2026 par-3 scoring read E off his 2016
    // handicap of 24 where the round he actually played, off 13, was +4.
    const handicap = mode === "nett" ? (doc.playingHandicap ?? (doc.player as PayloadPlayer).championshipHandicap ?? 0) : 0;
    const strokesReceived = allocateStrokes(handicap, holeInfos);
    const scoreByHole = holeInfos.map((_, i) => {
      const strokes = doc.holes?.[i]?.strokes;
      return strokes == null ? undefined : strokes - strokesReceived[i];
    });
    const lostHoles = holeInfos.map((_, i) => doc.holes?.[i]?.strokes == null && (Boolean(doc.holes?.[i]?.noReturn) || Boolean(doc.withdrawn)));
    return { player, scoreByHole, lostHoles };
  });

  return { holeInfos, playerScores };
});

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
  const frontNineRows: StatRow[] = [];
  const backNineRows: StatRow[] = [];
  const bounceBackRows: { row: StatRow; chances: number }[] = [];
  const reverseBounceBackRows: { row: StatRow; chances: number }[] = [];
  const birdieToBogeyRows: StatRow[] = [];
  const birdieOrBetterPercentRows: StatRow[] = [];
  const bogeyAvoidanceRows: StatRow[] = [];
  const eagleRows: StatRow[] = [];
  const holesPerEagleRows: StatRow[] = [];
  const parBirdieRows: Record<3 | 4 | 5, StatRow[]> = { 3: [], 4: [], 5: [] };

  for (const { player, scoreByHole, lostHoles } of playerScores) {
    const { chances, bounced } = bounceBack(scoreByHole, holeInfos);
    if (chances > 0) bounceBackRows.push({ row: percentageRow(player, bounced, chances), chances });
    const reverse = reverseBounceBack(scoreByHole, holeInfos);
    if (reverse.chances > 0) reverseBounceBackRows.push({ row: percentageRow(player, reverse.bounced, reverse.chances), chances: reverse.chances });

    // A nine counts once every hole in it has a score, even if the player picked up later in the
    // round: a no-return's completed front nine is a real front nine.
    for (const [rows, start] of [[frontNineRows, 0], [backNineRows, 9]] as const) {
      const nine = nineToPar(scoreByHole, holeInfos, start);
      if (nine !== undefined) rows.push({ player, value: nine, display: formatToPar(nine) });
    }

    const parTotals: Record<3 | 4 | 5, { sum: number; count: number }> = {
      3: { sum: 0, count: 0 },
      4: { sum: 0, count: 0 },
      5: { sum: 0, count: 0 },
    };
    // Birdies or better on each par, out of that par's holes played -- a share, so a no-return's holes count too.
    const parBirdies: Record<3 | 4 | 5, { birdies: number; played: number }> = { 3: { birdies: 0, played: 0 }, 4: { birdies: 0, played: 0 }, 5: { birdies: 0, played: 0 } };
    let eagleCount = 0;
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

      if (par === 3 || par === 4 || par === 5) {
        parBirdies[par].played += 1;
        if (relative <= -1) parBirdies[par].birdies += 1;
      }
      if (relative <= -2) eagleCount += 1;
      if (relative <= -1) birdieOrBetterCount += 1;
      else if (relative === 0) parCount += 1;
      else bogeyOrWorseCount += 1;

      const fieldAverage = holeFieldAverage[i];
      if (fieldAverage !== undefined) strokesGainedTotal += fieldAverage - score;
    });

    // A total over a set of holes is only comparable when none of them was lost. A no-return's par-3
    // total with one par 3 missing read -1 and topped the 2026 table above a dozen complete ones,
    // so a player who picked up on (or withdrew before) a par 3 has no par-3 total at all. A hole
    // not yet reached in a live round is not lost, so the tables still fill in as play goes on.
    ([3, 4, 5] as const).forEach((par) => {
      const { sum, count } = parTotals[par];
      if (count === 0) return;
      if (holeInfos.some((info, i) => info.par === par && lostHoles[i])) return;
      parBuckets[par].push({ player, value: sum, display: formatToPar(sum) });
    });

    if (holesPlayed > 0) {
      birdieOrBetterRows.push({ player, value: birdieOrBetterCount, display: String(birdieOrBetterCount) });
      parCountRows.push({ player, value: parCount, display: String(parCount) });
      bogeyOrWorseRows.push({ player, value: bogeyOrWorseCount, display: String(bogeyOrWorseCount) });
      // Only once something has happened: a run of pars alone has neither birdies nor bogeys to compare.
      if (birdieOrBetterCount + bogeyOrWorseCount > 0) birdieToBogeyRows.push(birdieToBogeyRow(player, birdieOrBetterCount, bogeyOrWorseCount));
      // Shares of the holes actually played, so a no-return's shorter card is measured fairly.
      birdieOrBetterPercentRows.push(percentageRow(player, birdieOrBetterCount, holesPlayed));
      bogeyAvoidanceRows.push(percentageRow(player, bogeyOrWorseCount, holesPlayed));
      // Only players who made one: a table of the whole field on nought would say nothing.
      if (eagleCount > 0) {
        eagleRows.push({ player, value: eagleCount, display: String(eagleCount) });
        holesPerEagleRows.push(holesPerEagleRow(player, holesPlayed, eagleCount));
      }
    }
    ([3, 4, 5] as const).forEach((par) => {
      const { birdies, played } = parBirdies[par];
      if (played > 0) parBirdieRows[par].push(percentageRow(player, birdies, played));
    });
    // Strokes gained is a total over the holes played, so the same rule: a lost hole leaves it short.
    if (holesPlayed > 0 && !lostHoles.some(Boolean)) {
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
  frontNineRows.sort((a, b) => a.value - b.value);
  assignPositions(frontNineRows);
  backNineRows.sort((a, b) => a.value - b.value);
  assignPositions(backNineRows);
  birdieToBogeyRows.sort((a, b) => b.value - a.value);
  assignPositions(birdieToBogeyRows);
  birdieOrBetterPercentRows.sort((a, b) => b.value - a.value);
  assignPositions(birdieOrBetterPercentRows);
  // PGA Tour's Bogey Avoidance: the share of holes at bogey or worse, so lower is better.
  bogeyAvoidanceRows.sort((a, b) => a.value - b.value);
  assignPositions(bogeyAvoidanceRows);
  eagleRows.sort((a, b) => b.value - a.value);
  assignPositions(eagleRows);
  holesPerEagleRows.sort((a, b) => a.value - b.value);
  assignPositions(holesPerEagleRows);
  ([3, 4, 5] as const).forEach((par) => {
    parBirdieRows[par].sort((a, b) => b.value - a.value);
    assignPositions(parBirdieRows[par]);
  });

  const label = mode === "nett" ? "Nett" : "Scratch";
  return [
    { key: `best-front-9-${mode}`, title: `Best Front 9 - ${label}`, columnLabel: "TOTAL", rows: frontNineRows, useParColoring: true },
    { key: `best-back-9-${mode}`, title: `Best Back 9 - ${label}`, columnLabel: "TOTAL", rows: backNineRows, useParColoring: true },
    { key: `par-3-scoring-${mode}`, title: `Par 3 Scoring - ${label}`, columnLabel: "TOTAL", rows: parBuckets[3], useParColoring: true },
    { key: `par-4-scoring-${mode}`, title: `Par 4 Scoring - ${label}`, columnLabel: "TOTAL", rows: parBuckets[4], useParColoring: true },
    { key: `par-5-scoring-${mode}`, title: `Par 5 Scoring - ${label}`, columnLabel: "TOTAL", rows: parBuckets[5], useParColoring: true },
    { key: `most-birdies-or-better-${mode}`, title: "Most Birdies or Better", columnLabel: "TOTAL", rows: birdieOrBetterRows },
    { key: `most-pars-${mode}`, title: "Most Pars", columnLabel: "TOTAL", rows: parCountRows },
    { key: `most-bogeys-or-worse-${mode}`, title: "Most Bogeys or Worse", columnLabel: "TOTAL", rows: bogeyOrWorseRows },
    {
      key: `bounce-back-${mode}`,
      title: `Bounce Back - ${label}`,
      columnLabel: "RATE",
      rows: rankRates(bounceBackRows, BOUNCE_BACK_MINIMUM, "high"),
      note: bounceBackNote(BOUNCE_BACK_MINIMUM),
      emptyMessage: `Nobody reached ${BOUNCE_BACK_MINIMUM} chances.`,
    },
    {
      key: `reverse-bounce-back-${mode}`,
      title: `Reverse Bounce Back - ${label}`,
      columnLabel: "RATE",
      rows: rankRates(reverseBounceBackRows, REVERSE_BOUNCE_BACK_MINIMUM, "low"),
      note: bounceBackNote(REVERSE_BOUNCE_BACK_MINIMUM),
      emptyMessage: `Nobody reached ${REVERSE_BOUNCE_BACK_MINIMUM} chances.`,
    },
    { key: `birdie-to-bogey-ratio-${mode}`, title: `Birdie to Bogey Ratio - ${label}`, columnLabel: "RATIO", rows: birdieToBogeyRows },
    { key: `birdie-or-better-percentage-${mode}`, title: `Birdie or Better % - ${label}`, columnLabel: "RATE", rows: birdieOrBetterPercentRows },
    { key: `bogey-avoidance-${mode}`, title: `Bogey Avoidance - ${label}`, columnLabel: "RATE", rows: bogeyAvoidanceRows },
    { key: `most-eagles-or-better-${mode}`, title: `Most Eagles or Better - ${label}`, columnLabel: "TOTAL", rows: eagleRows, emptyMessage: "No eagles." },
    { key: `holes-per-eagle-${mode}`, title: `Holes per Eagle - ${label}`, columnLabel: "HOLES", rows: holesPerEagleRows, emptyMessage: "No eagles." },
    ...([3, 4, 5] as const).map((par) => ({
      key: `par-${par}-birdie-or-better-${mode}`,
      title: `Par ${par} Birdie or Better - ${label}`,
      columnLabel: "RATE",
      rows: parBirdieRows[par],
    })),
    { key: `strokes-gained-${mode}`, title: "Strokes Gained", columnLabel: "TOTAL", rows: strokesGainedRows, useParColoring: true },
  ];
}

export async function getNettScoringCategories(championshipId?: string): Promise<StatCategory[]> {
  return getScoringCategories("nett", championshipId);
}

export async function getScratchScoringCategories(championshipId?: string): Promise<StatCategory[]> {
  return getScoringCategories("scratch", championshipId);
}

type StreakKind = "under-par" | "par-or-better" | "par" | "bogey-or-worse";

/** Longest run of consecutive played holes (in hole order) matching the streak's condition. */
export function longestStreak(scoreByHole: (number | undefined)[], holeInfos: HoleInfo[], kind: StreakKind): number {
  let longest = 0;
  let current = 0;
  holeInfos.forEach((info, i) => {
    const score = scoreByHole[i];
    if (score == null) {
      current = 0;
      return;
    }
    const relative = score - info.par;
    const matches =
      kind === "under-par" ? relative <= -1 : kind === "par-or-better" ? relative <= 0 : kind === "par" ? relative === 0 : relative >= 1;
    current = matches ? current + 1 : 0;
    if (current > longest) longest = current;
  });
  return longest;
}

async function getStreakCategoriesForMode(mode: ScoringMode, championshipId?: string): Promise<StatCategory[]> {
  const { holeInfos, playerScores } = await getPlayerScoresByMode(mode, championshipId);
  if (holeInfos.length === 0) return [];

  const underParRows: StatRow[] = [];
  const parOrBetterRows: StatRow[] = [];
  const parRows: StatRow[] = [];
  const bogeyOrWorseRows: StatRow[] = [];

  for (const { player, scoreByHole } of playerScores) {
    const holesPlayed = scoreByHole.filter((s) => s != null).length;
    if (holesPlayed === 0) continue;

    const underPar = longestStreak(scoreByHole, holeInfos, "under-par");
    const parOrBetter = longestStreak(scoreByHole, holeInfos, "par-or-better");
    const parStreak = longestStreak(scoreByHole, holeInfos, "par");
    const bogeyOrWorse = longestStreak(scoreByHole, holeInfos, "bogey-or-worse");

    // Only players with at least one hole under par: most of the gross field has none.
    if (underPar > 0) underParRows.push({ player, value: underPar, display: String(underPar) });
    parOrBetterRows.push({ player, value: parOrBetter, display: String(parOrBetter) });
    parRows.push({ player, value: parStreak, display: String(parStreak) });
    bogeyOrWorseRows.push({ player, value: bogeyOrWorse, display: String(bogeyOrWorse) });
  }

  [underParRows, parOrBetterRows, parRows, bogeyOrWorseRows].forEach((rows) => {
    rows.sort((a, b) => b.value - a.value);
    assignPositions(rows);
  });

  const label = mode === "nett" ? "Nett" : "Scratch";
  return [
    { key: `longest-under-par-streak-${mode}`, title: `Longest ${label} Under Par Streak`, columnLabel: "TOTAL", rows: underParRows, emptyMessage: "No holes under par." },
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
const getPlayerSkillHoles = cache(async function getPlayerSkillHoles(
  championshipId?: string,
): Promise<{ holeInfos: HoleInfo[]; players: PlayerSkillHoles[] }> {
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
    // Blank is "not recorded", not "missed". Nobody has entered a fairway or green on any card yet,
    // and reading blank as false ranked the whole 2026 field joint first on 0/14 fairways and 0/18
    // greens. A hole only counts once the box has actually been set one way or the other.
    const recorded = (v: boolean | null | undefined) => (v == null ? undefined : v);
    const fairwayHitByHole = holeInfos.map((_, i) => (doc.holes?.[i]?.strokes != null ? recorded(doc.holes[i]?.fairwayHit) : undefined));
    const girByHole = holeInfos.map((_, i) => (doc.holes?.[i]?.strokes != null ? recorded(doc.holes[i]?.greenInRegulation) : undefined));
    const puttsByHole = holeInfos.map((_, i) => (doc.holes?.[i]?.strokes != null ? (doc.holes[i]?.putts ?? undefined) : undefined));
    return { player, fairwayHitByHole, girByHole, puttsByHole };
  });

  return { holeInfos, players };
});

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
