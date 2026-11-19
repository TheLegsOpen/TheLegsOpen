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
  return matchPlayHoles(a, b)?.result;
}

/** Who took a hole, from the first player's side; "unplayed" once the match was already decided. */
export type HoleOutcome = "won" | "lost" | "halved" | "unplayed";

export interface MatchPlayCard {
  result: MatchPlayResult;
  /** One entry per hole, in order. */
  holes: HoleOutcome[];
  /** The hole the match was won on, or undefined when it went the distance (including all square). */
  decidedOn?: number;
}

/**
 * The same match as matchPlayResult, hole by hole -- for the head-to-head match card, which colours
 * each hole by who won it. Holes after the match was decided are "unplayed", as they would be in
 * real match play.
 */
export function matchPlayHoles(a: HoleScore[] | undefined, b: HoleScore[] | undefined): MatchPlayCard | undefined {
  if (!a?.length || !b?.length) return undefined;
  const count = Math.max(a.length, b.length);
  if (!a.some((h) => h.value !== undefined) || !b.some((h) => h.value !== undefined)) return undefined;
  const holes: HoleOutcome[] = [];
  let up = 0; // positive: the first player is ahead
  for (let i = 0; i < count; i++) {
    const x = a[i]?.value;
    const y = b[i]?.value;
    const outcome: HoleOutcome =
      x !== undefined && y !== undefined ? (x < y ? "won" : x > y ? "lost" : "halved") : x !== undefined ? "won" : y !== undefined ? "lost" : "halved";
    holes.push(outcome);
    up += outcome === "won" ? 1 : outcome === "lost" ? -1 : 0;
    const left = count - (i + 1);
    if (Math.abs(up) > left) {
      const margin = Math.abs(up);
      const score = left === 0 ? `${margin} Up` : `${margin} & ${left}`;
      while (holes.length < count) holes.push("unplayed");
      return {
        result: up > 0 ? { outcome: "won", label: `Won ${score}` } : { outcome: "lost", label: `Lost ${score}` },
        holes,
        decidedOn: left === 0 ? undefined : i + 1,
      };
    }
  }
  return { result: { outcome: "halved", label: "A/S" }, holes };
}
