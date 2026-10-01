export interface HoleInfo {
  par: number;
  si: number;
}

/**
 * Standard stroke allocation: one stroke on every hole for each full 18
 * of handicap, plus one more on holes whose Stroke Index is at or below
 * the remainder. Handles handicaps above 18 (extra strokes stack on the
 * hardest holes) as well as the common 0-18 case.
 *
 * A plus handicap gives strokes back rather than receiving them, and does so
 * from the EASIEST hole down -- a plus-1 drops a shot at stroke index 18, not
 * at stroke index 1. That is the mirror of the ordinary case, not the same
 * arithmetic with a negative number: `Math.floor(-1 / 18)` is -1, so the
 * original expression handed a plus-1 player a stroke back on all eighteen
 * holes. Doug Scott played off plus-1 at Panmure in 2023, which is where this
 * surfaced -- his card only reconciles when the single shot comes off the 11th,
 * the stroke index 18 hole.
 */
export function allocateStrokes(handicap: number, holes: HoleInfo[]): number[] {
  if (handicap < 0) {
    const given = -handicap;
    const fullRounds = Math.floor(given / 18);
    const remainder = given % 18;
    // Stroke index 18 is given back first, then 17, and so on. Negated only when
    // there is something to negate, so an untouched hole is 0 rather than -0.
    return holes.map((hole) => {
      const back = fullRounds + (hole.si > 18 - remainder ? 1 : 0);
      return back === 0 ? 0 : -back;
    });
  }
  const fullRounds = Math.floor(handicap / 18);
  const remainder = handicap % 18;
  return holes.map((hole) => fullRounds + (hole.si <= remainder ? 1 : 0));
}

/** Standard Stableford points table relative to nett score vs par, floored at 0. */
export function stablefordPoints(nettScore: number, par: number): number {
  return Math.max(0, 2 - (nettScore - par));
}

export interface ScorecardTotals {
  holesCompleted: number;
  grossTotal: number;
  nettTotal: number;
  stablefordTotal: number;
  toParGross: number;
  toParNett: number;
  /** True if any hole was marked "X" (no return / picked up) — disqualifies Main and Scratch, but Stableford keeps accumulating. */
  noReturn: boolean;
}

/**
 * Computes all three competitions' totals from one set of hole-by-hole gross
 * strokes — supports partial rounds (holes not yet played are simply
 * skipped) so standings can update live as scores come in. A hole marked
 * "no return" (picked up rather than holed out) scores 0 Stableford points
 * and is otherwise excluded from Gross/Nett totals; if any hole is a no
 * return, the whole card is flagged `noReturn` so callers can show "NR" for
 * Main/Scratch while Stableford carries on unaffected.
 */
export function computeScorecardTotals(
  strokes: (number | null | undefined)[],
  noReturn: (boolean | null | undefined)[],
  holes: HoleInfo[],
  handicap: number,
): ScorecardTotals {
  const strokesReceived = allocateStrokes(handicap, holes);

  let holesCompleted = 0;
  let parPlayed = 0;
  let grossTotal = 0;
  let nettTotal = 0;
  let stablefordTotal = 0;
  let anyNoReturn = false;

  holes.forEach((hole, index) => {
    if (noReturn[index]) {
      holesCompleted += 1;
      anyNoReturn = true;
      return;
    }
    const gross = strokes[index];
    if (gross == null) return;
    holesCompleted += 1;
    parPlayed += hole.par;
    grossTotal += gross;
    const nett = gross - strokesReceived[index];
    nettTotal += nett;
    stablefordTotal += stablefordPoints(nett, hole.par);
  });

  return {
    holesCompleted,
    grossTotal,
    nettTotal,
    stablefordTotal,
    toParGross: grossTotal - parPlayed,
    toParNett: nettTotal - parPlayed,
    noReturn: anyNoReturn,
  };
}

/**
 * How a handicap is written down.
 *
 * A handicap below zero is a plus handicap: the player gives strokes back rather than receiving
 * them, and golf writes that with a leading plus -- a player stored as -1 is "+1" on a tee sheet
 * and everywhere else. The sign is inverted on purpose, which is why this exists rather than
 * `String(handicap)` at each call site. Doug Scott played off +1 at Panmure in 2023 and Gary
 * Drummond off +1 at Balmedie in 2025; both would otherwise read as "-1", which means nothing.
 *
 * Keep the stored value negative. The arithmetic in allocateStrokes depends on it, and the sign is
 * flipped only for display.
 */
export function formatHandicap(handicap: number): string {
  return handicap < 0 ? `+${-handicap}` : String(handicap);
}
