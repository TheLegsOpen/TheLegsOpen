import type { HoleScore } from "@/lib/data/scorecards";

export interface MatchPlayResult {
  /** From the first player's side: won, lost, or all square. */
  outcome: "won" | "lost" | "halved";
  /** "Won 3 & 2", "Lost 1 Up", "A/S". */
  label: string;
}

/**
 * The match two players would have had over the same round, hole by hole on nett scores (the
 * Main competition's per-hole value). Lower nett wins the hole; equal halves it. A hole one
 * player picked up or never played, and the other completed, goes to the other player; neither
 * completed, it is halved.
 *
 * The match ends as soon as one player is more holes up than there are holes left -- "3 & 2" is
 * three up with two to play. A match still alive on the 18th ends "1 Up" / "2 Up", golf's own
 * way of writing a match decided on the last hole, and level after 18 is all square.
 *
 * Returns undefined when either card has no hole-by-hole scores to play the match from.
 */
export function matchPlayResult(a: HoleScore[] | undefined, b: HoleScore[] | undefined): MatchPlayResult | undefined {
  if (!a?.length || !b?.length) return undefined;
  const holes = Math.max(a.length, b.length);
  if (!a.some((h) => h.value !== undefined) || !b.some((h) => h.value !== undefined)) return undefined;
  let up = 0; // positive: the first player is ahead
  for (let i = 0; i < holes; i++) {
    const x = a[i]?.value;
    const y = b[i]?.value;
    if (x !== undefined && y !== undefined) up += x < y ? 1 : x > y ? -1 : 0;
    else if (x !== undefined) up += 1;
    else if (y !== undefined) up -= 1;
    const left = holes - (i + 1);
    if (Math.abs(up) > left) {
      const margin = Math.abs(up);
      const score = left === 0 ? `${margin} Up` : `${margin} & ${left}`;
      return up > 0 ? { outcome: "won", label: `Won ${score}` } : { outcome: "lost", label: `Lost ${score}` };
    }
  }
  return { outcome: "halved", label: "A/S" };
}
