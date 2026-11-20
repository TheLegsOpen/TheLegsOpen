import type { PayloadRequest } from "payload";

import { getCompetitionLeaderboardForChampionshipId } from "@/lib/data/scorecards";
import { resolveCompetitionWinner } from "@/lib/data/championship-stats";
import { largestLeadOnTheClock } from "@/lib/data/round-timeline";

/**
 * These three mirror the exact same figures the /records page shows ("Largest margin of victory",
 * "Lowest score in a round by a champion" / "Lowest winning total in relation to par", "Largest
 * lead by any player") -- computed independently here rather than by calling getRecords() (which
 * pulls in the full championship history, player list, and per-year auto-facts computation, far
 * more than a single live scorecard save needs), but from the same underlying leaderboard data, so
 * a live-blog claim and the historical page entry it's citing never disagree.
 */

export interface MarginRecord {
  margin: number;
  holderName: string;
  year: number;
}

export interface WinningScoreRecord {
  toParNett: number;
  holderName: string;
  year: number;
}

export interface LeadRecord {
  margin: number;
  holderName: string;
  year: number;
}

async function priorChampionships(req: PayloadRequest, currentChampionshipId: string | number) {
  const result = await req.payload.find({
    collection: "championships",
    where: { id: { not_equals: currentChampionshipId } },
    limit: 100,
    depth: 0,
    req,
  });
  return result.docs as unknown as { id: string; year: number }[];
}

/** Biggest winning margin (Main, nett-to-par) ever recorded, from any prior championship. Skips a
 * year whose title was shared/decided by countback -- a tiebreak win has no real stroke margin to
 * compare, the same caution records.ts's own largestMargin takes. */
export async function getLargestMarginRecord(req: PayloadRequest, currentChampionshipId: string | number): Promise<MarginRecord | null> {
  const championships = await priorChampionships(req, currentChampionshipId);
  let best: MarginRecord | null = null;
  for (const championship of championships) {
    const entries = await getCompetitionLeaderboardForChampionshipId(championship.id, "main", req);
    const winner = entries.find((e) => e.position === 1 && !e.tied && e.thru === "F");
    const runnerUp = entries.find((e) => e.position === 2 && e.thru === "F");
    if (!winner || !runnerUp || winner.toPar === undefined || runnerUp.toPar === undefined) continue;
    const margin = runnerUp.toPar - winner.toPar;
    if (margin > 0 && (!best || margin > best.margin)) {
      best = { margin, holderName: winner.player.name, year: championship.year };
    }
  }
  return best;
}

/**
 * Lowest winning total (Main, nett-to-par) ever recorded, from any prior championship.
 *
 * Unlike the margin record above, a playoff year counts here. That distinction was missed and it
 * published a false claim: in 2019 the blog told everyone Bryan Forbes's -1 was the lowest winning
 * total in championship history, when Alistair Campbell had won at -4 in 2013. Campbell was
 * invisible to this lookup because he won on countback, so the raw leaderboard has him tied for
 * first and the outright-winner filter borrowed from getLargestMarginRecord skipped his year
 * entirely. A tiebreak has no stroke margin to compare, which is why that filter is right there --
 * but it has a score, which is all this record needs. The Records page had it right all along,
 * reading the stored figure, so the two disagreed in public.
 */
export async function getLowestWinningScoreRecord(req: PayloadRequest, currentChampionshipId: string | number): Promise<WinningScoreRecord | null> {
  const championships = await priorChampionships(req, currentChampionshipId);
  let best: WinningScoreRecord | null = null;
  for (const championship of championships) {
    const entries = await getCompetitionLeaderboardForChampionshipId(championship.id, "main", req);
    // The record is about the score, not about who took the trophy, so it reads the leading
    // finished score directly -- which is the same whether the title was won outright, on
    // countback, or shared. The countback is still resolved where it can be, purely to put the
    // right name against it.
    const leaders = entries.filter((e) => e.position === 1 && e.thru === "F" && !e.noReturn && e.toPar !== undefined);
    if (leaders.length === 0) continue;
    const resolved = resolveCompetitionWinner(entries, "main", new Set());
    const winner = resolved.winnerEntry ?? leaders[0];
    if (winner.toPar === undefined) continue;
    if (!best || winner.toPar < best.toParNett) {
      best = { toParNett: winner.toPar, holderName: winner.player.name, year: championship.year };
    }
  }
  return best;
}

/** Largest lead held by ANY player, at ANY point in a round, ever recorded, from any prior
 * championship -- unlike the two records above (only knowable once a championship concludes),
 * this can be compared against a live in-progress lead at any time.
 *
 * Measured on the clock, exactly as the Records page's "Largest lead by any player" is, because
 * the live lead it is compared against is the leaderboard as it stands, not a hole-for-hole
 * comparison. This used to rebuild the record hole for hole from finished cards only, which is
 * how the 2016 post credited the previous record to John Pow in 2014 (it was David Clee's 4 at
 * Lanark in 2015) and the 2020 post called Kevin Park's 5-shot lead unprecedented when it only
 * equalled Clee's 5 at Southerness. */
export async function getLargestLeadRecord(req: PayloadRequest, currentChampionshipId: string | number): Promise<LeadRecord | null> {
  const championships = await priorChampionships(req, currentChampionshipId);
  let best: LeadRecord | null = null;
  for (const championship of championships) {
    const entries = await getCompetitionLeaderboardForChampionshipId(championship.id, "main", req);
    const lead = largestLeadOnTheClock(entries);
    if (lead && lead.margin > 0 && (!best || lead.margin > best.margin)) {
      best = { margin: lead.margin, holderName: lead.holderName, year: championship.year };
    }
  }
  return best;
}
