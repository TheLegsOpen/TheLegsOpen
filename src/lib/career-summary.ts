/**
 * A player's own career figures for the Stats tab on his profile. Not ranked against the field:
 * these are his numbers across every championship he has played, worked out from the same
 * results the Results tab lists.
 */

interface RoundResult {
  toPar?: number;
  noReturn?: boolean;
  withdrawn?: boolean;
}

export interface CareerAverage {
  /** Average score in relation to par, per completed round. */
  average: number;
  rounds: number;
}

export interface CareerSummary {
  nett?: CareerAverage;
  gross?: CareerAverage;
  subPar?: { nett: SubParRecord; gross: SubParRecord };
  nines?: { nett?: NineAverages; gross?: NineAverages };
}

function average(rounds: (RoundResult | undefined)[]): CareerAverage | undefined {
  // Completed rounds only. A no-return or a withdrawal is not a round's score, and counting the
  // holes it did have would compare a part-card with whole ones.
  const scores = rounds.filter((r): r is RoundResult & { toPar: number } => Boolean(r) && !r!.noReturn && !r!.withdrawn && r!.toPar !== undefined);
  if (scores.length === 0) return undefined;
  return { average: scores.reduce((sum, r) => sum + r.toPar, 0) / scores.length, rounds: scores.length };
}

/** PGA Tour's Scoring Average, to par rather than in strokes, since the courses' pars differ: nett from the Main, gross from the Scratch. */
export function careerScoringAverage(results: { main: RoundResult; scratch?: RoundResult }[]): CareerSummary {
  const summary: CareerSummary = {};
  const nett = average(results.map((r) => r.main));
  const gross = average(results.map((r) => r.scratch));
  if (nett) summary.nett = nett;
  if (gross) summary.gross = gross;
  return summary;
}

export interface SubParRecord {
  rounds: number;
  /** Most championships in a row under par, counting only the ones he played. */
  bestStreak: number;
}

function subPar(rounds: (RoundResult | undefined)[]): SubParRecord {
  let count = 0;
  let current = 0;
  let best = 0;
  for (const round of rounds) {
    // Strictly under par. Level par, a no-return or a withdrawal ends a run; a year he didn't play
    // isn't in the list at all, so it doesn't.
    const under = Boolean(round) && !round!.noReturn && !round!.withdrawn && round!.toPar !== undefined && round!.toPar < 0;
    if (under) {
      count += 1;
      current += 1;
      best = Math.max(best, current);
    } else current = 0;
  }
  return { rounds: count, bestStreak: best };
}

/** PGA Tour's Sub-Par Rounds and Best Sub-Par Rounds Streak, nett from the Main and gross from the Scratch. */
export function subParRounds(results: { year: number; main: RoundResult; scratch?: RoundResult }[]): { nett: SubParRecord; gross: SubParRecord } {
  const oldestFirst = [...results].sort((a, b) => a.year - b.year);
  return { nett: subPar(oldestFirst.map((r) => r.main)), gross: subPar(oldestFirst.map((r) => r.scratch)) };
}

interface CardResult extends RoundResult {
  holes?: { holeNumber: number; par: number; value?: number }[];
}

export interface NineAverages {
  front?: CareerAverage;
  back?: CareerAverage;
}

function nineToPar(holes: NonNullable<CardResult["holes"]>, first: number): number | undefined {
  let total = 0;
  for (let n = first; n < first + 9; n++) {
    const hole = holes.find((h) => h.holeNumber === n);
    if (hole?.value === undefined) return undefined;
    total += hole.value - hole.par;
  }
  return total;
}

function sideAverages(cards: (CardResult | undefined)[]): NineAverages {
  const sides: NineAverages = {};
  for (const [side, first] of [["front", 1], ["back", 10]] as const) {
    // Every complete nine, as the Statistics page's Best Front 9 and Best Back 9 count them: a
    // no-return's finished front nine is a real front nine. A year with no scorecard has none.
    const nines = cards.flatMap((card) => (card?.holes ? [nineToPar(card.holes, first)] : [])).filter((n): n is number => n !== undefined);
    if (nines.length > 0) sides[side] = { average: nines.reduce((sum, n) => sum + n, 0) / nines.length, rounds: nines.length };
  }
  return sides;
}

/** Front 9 and back 9 scoring average to par, nett from the Main and gross from the Scratch. */
export function nineAverages(results: { main: CardResult; scratch?: CardResult }[]): { nett?: NineAverages; gross?: NineAverages } {
  const out: { nett?: NineAverages; gross?: NineAverages } = {};
  const nett = sideAverages(results.map((r) => r.main));
  const gross = sideAverages(results.map((r) => r.scratch));
  if (nett.front || nett.back) out.nett = nett;
  if (gross.front || gross.back) out.gross = gross;
  return out;
}

/** "+7.4", "-0.3", or "E" for anything that rounds to level. */
export function formatAverageToPar(value: number): string {
  // Rounded on the size and the sign put back, so -0.25 reads -0.3 as +0.25 reads +0.3 (Math.round
  // alone takes -2.5 up to -2).
  const rounded = (Math.sign(value) * Math.round(Math.abs(value) * 10)) / 10;
  if (rounded === 0) return "E";
  return rounded > 0 ? `+${rounded.toFixed(1)}` : `-${Math.abs(rounded).toFixed(1)}`;
}
