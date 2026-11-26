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

/** "+7.4", "-0.3", or "E" for anything that rounds to level. */
export function formatAverageToPar(value: number): string {
  // Rounded on the size and the sign put back, so -0.25 reads -0.3 as +0.25 reads +0.3 (Math.round
  // alone takes -2.5 up to -2).
  const rounded = (Math.sign(value) * Math.round(Math.abs(value) * 10)) / 10;
  if (rounded === 0) return "E";
  return rounded > 0 ? `+${rounded.toFixed(1)}` : `-${Math.abs(rounded).toFixed(1)}`;
}
