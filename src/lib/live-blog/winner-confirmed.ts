import type { PayloadRequest } from "payload";

import { isConcluded, formatToPar } from "@/lib/leaderboard";
import { resolveCompetitionWinner, type WinnerResolution } from "@/lib/data/championship-stats";
import { winnerConfirmedCommentary } from "@/lib/live-blog/commentary";
import { evaluateAndPublish, type PublicationConfig, type TriggerCandidate } from "@/lib/live-blog/publication-policy";
import type { Competition, CompetitionEntry, LeaderboardSnapshotPair } from "@/lib/data/scorecards";

const COMPETITION_LABEL: Record<Competition, string> = { main: "Main", stableford: "Stableford", scratch: "Scratch" };

function scoreLabel(competition: Competition, entry: CompetitionEntry): string {
  return competition === "stableford" ? `${entry.score ?? 0} pts` : formatToPar(entry.toPar ?? 0);
}

/**
 * The one detector the site was missing entirely: an explicit "the competition is over, here's
 * the winner" post, the moment the last player still out on course finishes. Reuses
 * resolveCompetitionWinner (src/lib/data/championship-stats.ts) -- previously only run when an
 * admin manually ticks the Championship's "Completed" checkbox -- rather than re-implementing
 * tiebreak-aware winner detection here. If the top spot is still genuinely tied (no tiebreak
 * winner determinable, e.g. a playoff hasn't been recorded yet), this silently declines to post,
 * matching how the manual "Completed" flow already treats a real tie: don't guess.
 *
 * All three competitions finish on the exact same save (they're all derived from the same
 * scorecard's holesCompleted), so a single "did Main just conclude?" check gates all three.
 * No-return (disqualified) players are filtered out of Main/Scratch before resolution -- see the
 * note below on why resolveCompetitionWinner can't be trusted with them included.
 */
export async function generateWinnerConfirmedPosts(
  req: PayloadRequest,
  championshipId: string,
  snapshots: LeaderboardSnapshotPair,
  saveNonce: string,
  config: PublicationConfig,
): Promise<void> {
  const mainBefore = snapshots.before.main.filter((e) => !e.noReturn);
  const mainAfter = snapshots.after.main.filter((e) => !e.noReturn);
  if (isConcluded(mainBefore) || !isConcluded(mainAfter)) return;

  const mainResult = resolveCompetitionWinner(mainAfter, "main", new Set());

  // A player can't also be Stableford champion -- mirrors computeChampionshipAutoStats' own
  // exclusion rule, so the live post and the eventual admin-facing stats never disagree.
  const excludeFromStableford = mainResult.winner ? new Set([mainResult.winner.id]) : new Set<string>();
  const stablefordResult = resolveCompetitionWinner(snapshots.after.stableford, "stableford", excludeFromStableford);

  // resolveCompetitionWinner's metric() falls back to `toPar ?? 0` for a player with no toPar --
  // for Main/Scratch, a no-return player's toPar is deliberately undefined (they're
  // disqualified), and 0 would misread as "level par", so they must be filtered out first rather
  // than passed through and relying on excludeIds (which only excludes by id, not by DQ status).
  const scratchAfter = snapshots.after.scratch.filter((e) => !e.noReturn);
  const scratchResult = resolveCompetitionWinner(scratchAfter, "scratch", new Set());

  const jobs: { competition: Competition; result: WinnerResolution }[] = [
    { competition: "main", result: mainResult },
    { competition: "stableford", result: stablefordResult },
    { competition: "scratch", result: scratchResult },
  ];

  for (const { competition, result } of jobs) {
    if (!result.winner || !result.winnerEntry) continue;

    const { headline, body } = winnerConfirmedCommentary(result.winner.name, COMPETITION_LABEL[competition], scoreLabel(competition, result.winnerEntry));
    const candidate: TriggerCandidate = {
      category: "winner-confirmed",
      championshipId,
      playerId: result.winner.id,
      playerName: result.winner.name,
      saveNonce: `${saveNonce}:${competition}`,
      significance: { category: "winner-confirmed", inContention: true },
      post: {
        category: "winner-confirmed",
        competition,
        headline,
        body,
        championship: championshipId,
        player: result.winner.id,
        scoreRelative: competition === "stableford" ? result.winnerEntry.score : result.winnerEntry.toPar,
      },
    };
    await evaluateAndPublish(req, candidate, config);
  }
}
