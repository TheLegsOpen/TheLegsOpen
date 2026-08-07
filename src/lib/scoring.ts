export interface HoleInfo {
  par: number;
  si: number;
}

/**
 * Standard stroke allocation: one stroke on every hole for each full 18
 * of handicap, plus one more on holes whose Stroke Index is at or below
 * the remainder. Handles handicaps above 18 (extra strokes stack on the
 * hardest holes) as well as the common 0-18 case.
 */
export function allocateStrokes(handicap: number, holes: HoleInfo[]): number[] {
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
