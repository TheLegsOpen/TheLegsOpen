import type { Payload, CollectionAfterChangeHook } from "payload";

import { getCompetitionLeaderboardForChampionshipId, getAllScorecardParticipation } from "@/lib/data/scorecards";
import { resolveTiebreak } from "@/lib/data/playoffs";
import { isConcluded } from "@/lib/leaderboard";
import type { Competition, CompetitionEntry } from "@/lib/data/scorecards";
import type { TiebreakStepResult } from "@/lib/data/playoffs";
import type { Player } from "@/types/player";
import type { Scorecard } from "@/payload-types";

/**
 * Auto-derives the Championships collection's "Records" fields straight from real scorecard
 * data, the same way the Records page already does (see computeAutoFacts in lib/data/records.ts)
 * -- but this determines the winner from scratch, rather than only verifying one that's already
 * been typed in by hand. Wired up in Championships.ts (fires when "Completed" is ticked) and
 * Scorecards.ts (keeps it in sync if a score is corrected after the fact).
 */

export interface ChampionshipAutoStats {
  winnerName?: string;
  winnerCountry?: string;
  winnerPlayer?: string;
  winningScore?: number;
  scoreToPar?: number;
  margin?: string;
  stablefordWinnerName?: string;
  stablefordWinnerCountry?: string;
  scratchWinnerName?: string;
  scratchWinnerCountry?: string;
  runnerUpName?: string;
  runnerUpScore?: number;
  priorAppearances?: number;
  championAgeAtWin?: number;
  ledOutrightAfter9?: boolean;
  deficitAfter9?: number;
  largestLeadHolderName?: string;
  largestLeadMargin?: number;
  largestLeadAfterHole?: number;
}

function ageInYears(dobIso: string, asOfIso: string): number {
  const dob = new Date(dobIso);
  const asOf = new Date(asOfIso);
  let age = asOf.getFullYear() - dob.getFullYear();
  const monthDiff = asOf.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && asOf.getDate() < dob.getDate())) age--;
  return age;
}

/** Cumulative to-par after each hole, for every player who completed all 18 with a valid round -- the real basis for front-9/lead facts. A no-return player can still show thru "F" (all 18 hole slots filled in, some as NR) despite being disqualified, so that alone isn't enough. */
function runningTotalsByPlayer(entries: CompetitionEntry[]): Map<string, number[]> {
  const map = new Map<string, number[]>();
  for (const entry of entries) {
    if (entry.thru !== "F" || entry.noReturn) continue;
    let running = 0;
    const cumulative: number[] = [];
    for (const hole of entry.holes) {
      running += hole.relative;
      cumulative.push(running);
    }
    map.set(entry.player.id, cumulative);
  }
  return map;
}

function leadAtHole(
  cumulativeByPlayer: Map<string, number[]>,
  holeIndex: number,
): { leaderId: string; leaderValue: number; lead: number } | undefined {
  const values = Array.from(cumulativeByPlayer.entries())
    .map(([id, cumulative]) => ({ id, value: cumulative[holeIndex] }))
    .filter((v): v is { id: string; value: number } => v.value !== undefined)
    .sort((a, b) => a.value - b.value);
  if (values.length < 2) return undefined;
  return { leaderId: values[0].id, leaderValue: values[0].value, lead: values[1].value - values[0].value };
}

export interface WinnerResolution {
  winner?: Player;
  winnerEntry?: CompetitionEntry;
  runnerUp?: CompetitionEntry;
  viaTiebreak: boolean;
  /** The deciding tiebreak's full step-by-step countback, when viaTiebreak is true -- lets a caller show the actual scores that decided it (e.g. "-2 to E"), not just who won. */
  steps?: TiebreakStepResult[];
  /** Every player tied for the top spot before the tiebreak resolved it, when viaTiebreak is true -- e.g. for announcing "X and Y are headed to a playoff" before the result itself is known. */
  tiedEntries?: CompetitionEntry[];
}

/**
 * Determines a competition's winner (and runner-up) purely from real scores -- handling an
 * outright leader, a tiebreak-resolved leader, and a leader who has to be skipped over entirely
 * (the Main champion, barred from also winning Stableford) all the same way. `excludeIds`
 * members are skipped even if they're the outright leader, falling through to whoever's next.
 */
export function resolveCompetitionWinner(entries: CompetitionEntry[], competition: Competition, excludeIds: Set<string>): WinnerResolution {
  if (!isConcluded(entries)) return { viaTiebreak: false };

  // A no-return player's toPar is deliberately undefined (see HoleScore/CompetitionEntry) --
  // `?? 0` would silently treat that as level par, which is often good enough to rank them near
  // the lead despite being disqualified from Main/Scratch. Stableford is never affected (a
  // no-return there just scores 0 for that hole, real toPar/score throughout), so this filter is
  // a no-op for it.
  const started = entries.filter((e) => e.started && !e.noReturn);
  const metric = (e: CompetitionEntry) => (competition === "stableford" ? -(e.score ?? 0) : (e.toPar ?? 0));
  const sorted = [...started].sort((a, b) => metric(a) - metric(b));

  const groups: CompetitionEntry[][] = [];
  for (const entry of sorted) {
    const last = groups[groups.length - 1];
    if (last && metric(last[0]) === metric(entry)) last.push(entry);
    else groups.push([entry]);
  }

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    const eligible = group.filter((e) => !excludeIds.has(e.player.id));
    if (eligible.length === 0) continue; // whole group excluded -- check the next-best group

    if (eligible.length === 1) {
      const runnerUp = group.length > 1 ? group.find((e) => e.player.id !== eligible[0].player.id) : groups[i + 1]?.[0];
      return { winner: eligible[0].player, winnerEntry: eligible[0], runnerUp, viaTiebreak: false };
    }

    const { winner, stillTied, steps } = resolveTiebreak(eligible, competition);
    if (!winner || stillTied) return { viaTiebreak: false }; // genuinely shared title -- don't guess
    const winnerEntry = eligible.find((e) => e.player.id === winner.id);
    const runnerUp = eligible.find((e) => e.player.id !== winner.id);
    return { winner, winnerEntry, runnerUp, viaTiebreak: true, steps, tiedEntries: eligible };
  }

  return { viaTiebreak: false };
}

export async function computeChampionshipAutoStats(payload: Payload, championshipId: string): Promise<ChampionshipAutoStats | undefined> {
  const championship = await payload.findByID({ collection: "championships", id: championshipId, depth: 0 }).catch(() => undefined);
  if (!championship) return undefined;

  const [main, stableford, scratch] = await Promise.all([
    getCompetitionLeaderboardForChampionshipId(championshipId, "main"),
    getCompetitionLeaderboardForChampionshipId(championshipId, "stableford"),
    getCompetitionLeaderboardForChampionshipId(championshipId, "scratch"),
  ]);

  if (!isConcluded(main)) return undefined;

  const mainResult = resolveCompetitionWinner(main, "main", new Set());
  if (!mainResult.winner || !mainResult.winnerEntry) return undefined;
  const { winner, winnerEntry } = mainResult;

  const stats: ChampionshipAutoStats = {
    winnerName: winner.name,
    winnerCountry: winner.country,
    winnerPlayer: winner.id,
  };

  // Main (nett) is the competition that actually decides the champion, so winningScore/scoreToPar
  // and the runner-up's score reflect Main, not Scratch -- e.g. 65 / -4, not the gross total.
  stats.winningScore = winnerEntry.score;
  stats.scoreToPar = winnerEntry.toPar;

  if (mainResult.runnerUp) {
    stats.runnerUpName = mainResult.runnerUp.player.name;
    stats.runnerUpScore = mainResult.runnerUp.score;
  }
  if (mainResult.viaTiebreak) {
    stats.margin = "Playoff";
  } else if (mainResult.runnerUp?.toPar !== undefined && winnerEntry.toPar !== undefined) {
    stats.margin = String(mainResult.runnerUp.toPar - winnerEntry.toPar);
  }

  const stablefordResult = resolveCompetitionWinner(stableford, "stableford", new Set([winner.id]));
  if (stablefordResult.winner) {
    stats.stablefordWinnerName = stablefordResult.winner.name;
    stats.stablefordWinnerCountry = stablefordResult.winner.country;
  }

  const scratchResult = resolveCompetitionWinner(scratch, "scratch", new Set());
  if (scratchResult.winner) {
    stats.scratchWinnerName = scratchResult.winner.name;
    stats.scratchWinnerCountry = scratchResult.winner.country;
  }

  const cumulative = runningTotalsByPlayer(main);
  const after9 = leadAtHole(cumulative, 8);
  const winnerCumulative = cumulative.get(winner.id);
  if (after9 && winnerCumulative) {
    if (after9.leaderId === winner.id) {
      stats.ledOutrightAfter9 = true;
    } else {
      // Deficit is the champion's own gap to whoever actually led at 9, not the 1st-vs-2nd
      // gap (after9.lead) -- those only coincide when the champion happened to be sitting in
      // outright 2nd. When the champion was 3rd or worse, or 1st/2nd were tied for the lead,
      // using after9.lead as a stand-in silently produced the wrong number (or zero).
      stats.deficitAfter9 = winnerCumulative[8] - after9.leaderValue;
    }
  }

  let largestLead: { holderName: string; margin: number; afterHole: number } | undefined;
  for (let hole = 0; hole < 18; hole++) {
    const lead = leadAtHole(cumulative, hole);
    if (lead && (!largestLead || lead.lead > largestLead.margin)) {
      const holderEntry = main.find((e) => e.player.id === lead.leaderId);
      if (holderEntry) largestLead = { holderName: holderEntry.player.name, margin: lead.lead, afterHole: hole + 1 };
    }
  }
  if (largestLead) {
    stats.largestLeadHolderName = largestLead.holderName;
    stats.largestLeadMargin = largestLead.margin;
    stats.largestLeadAfterHole = largestLead.afterHole;
  }

  const winnerPlayerDoc = await payload.findByID({ collection: "players", id: winner.id, depth: 0 }).catch(() => undefined);
  if (winnerPlayerDoc?.dateOfBirth) {
    const atIso = championship.date ?? `${championship.year}-12-31`;
    stats.championAgeAtWin = ageInYears(winnerPlayerDoc.dateOfBirth, atIso);
  }

  const allChampionships = await payload.find({ collection: "championships", limit: 500, depth: 0 });
  const yearById = new Map(allChampionships.docs.map((c) => [String(c.id), c.year]));
  const participation = await getAllScorecardParticipation();
  const priorDigitalYears = new Set(
    participation
      .filter((p) => p.playerId === winner.id && p.started && (yearById.get(p.championshipId) ?? Infinity) < championship.year)
      .map((p) => p.championshipId),
  );
  stats.priorAppearances = (winnerPlayerDoc?.previousOpens ?? 0) + priorDigitalYears.size;

  return stats;
}

/** Scorecards afterChange hook -- if a score changes for a championship already marked "Completed", refreshes its auto-derived stats so a later correction doesn't leave them stale. */
export const syncChampionshipStatsAfterScoreChange: CollectionAfterChangeHook<Scorecard> = async ({ doc, previousDoc, req, operation }) => {
  if (operation !== "update") return doc;
  if (!doc.scoreUpdatedAt || doc.scoreUpdatedAt === previousDoc?.scoreUpdatedAt) return doc;

  const championshipId = typeof doc.championship === "object" ? doc.championship.id : doc.championship;
  if (!championshipId) return doc;

  const championship = await req.payload.findByID({ collection: "championships", id: championshipId, depth: 0, req }).catch(() => undefined);
  if (!championship?.completed) return doc;

  const stats = await computeChampionshipAutoStats(req.payload, String(championshipId));
  if (stats) {
    await req.payload.update({ collection: "championships", id: championshipId, data: stats, req });
  }

  return doc;
};
