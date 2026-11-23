/**
 * The hardest and easiest holes on a course, by the field's average against par. Holes are
 * compared at the two decimal places the course guide prints, so two holes that read +0.56 on the
 * page are both the easiest -- naming one of them would be a tie cut off at the limit. Castle Stuart
 * (4th and 5th) and Lanark (16th and 17th) both have exactly that tie for easiest.
 */
export function extremeHoles(holes: { holeNumber: number; par: number; average?: number }[]): { hardest: number[]; easiest: number[] } {
  const scored = holes
    .filter((h): h is { holeNumber: number; par: number; average: number } => h.average !== undefined)
    .map((h) => ({ holeNumber: h.holeNumber, overPar: Math.round((h.average - h.par) * 100) }));
  if (scored.length === 0) return { hardest: [], easiest: [] };
  const max = Math.max(...scored.map((h) => h.overPar));
  const min = Math.min(...scored.map((h) => h.overPar));
  return {
    hardest: scored.filter((h) => h.overPar === max).map((h) => h.holeNumber),
    easiest: scored.filter((h) => h.overPar === min).map((h) => h.holeNumber),
  };
}

/** "the 4th", "the 4th and 5th", "the 4th, 5th and 9th". */
export function holeList(holeNumbers: number[], ordinal: (n: number) => string): string {
  const words = holeNumbers.map(ordinal);
  if (words.length <= 1) return `the ${words[0] ?? ""}`;
  return `the ${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}
