import type { PayloadRequest } from "payload";

import { isConcluded, formatToPar } from "@/lib/leaderboard";
import { resolveCompetitionWinner, type WinnerResolution } from "@/lib/data/championship-stats";
import { winnerConfirmedCommentary, playoffCommentary, recordMarginCommentary, recordLowScoreCommentary } from "@/lib/live-blog/commentary";
import { getLargestMarginRecord, getLowestWinningScoreRecord } from "@/lib/live-blog/championship-records";
import type { TriggerCandidate } from "@/lib/live-blog/publication-policy";
import type { Competition, CompetitionEntry, LeaderboardSnapshotPair } from "@/lib/data/scorecards";

const COMPETITION_LABEL: Record<Competition, string> = { main: "Main", stableford: "Stableford", scratch: "Scratch" };

function scoreLabel(competition: Competition, entry: CompetitionEntry): string {
  return competition === "stableford" ? `${entry.score ?? 0} pts` : formatToPar(entry.toPar ?? 0);
}

/** "beating Bobby Ferguson on countback (-2 to E)" -- the deciding step's own scores, matching the same detail the Records page shows for a past playoff. Undefined if there's no countback to describe (shouldn't happen when viaTiebreak is true, but resolveCompetitionWinner's steps/tiedEntries are optional). */
function playoffDetail(result: WinnerResolution, competition: Competition): string | undefined {
  if (!result.winner || !result.steps || result.steps.length === 0) return undefined;
  const decidingStep = result.steps[result.steps.length - 1];
  const winnerScore = decidingStep.contenders.find((c) => c.player.id === result.winner!.id)?.display;
  const runnerUpContender = decidingStep.contenders
    .filter((c) => c.player.id !== result.winner!.id)
    .sort((a, b) => (competition === "stableford" ? b.value - a.value : a.value - b.value))[0];
  if (!winnerScore || !runnerUpContender) return undefined;
  return `Beat ${runnerUpContender.player.name} on countback, ${winnerScore} to ${runnerUpContender.display}.`;
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
 *
 * Returns the built candidates rather than publishing them directly -- both categories here
 * (playoff, winner-confirmed) are critical, so they're always exempt from generate.ts's
 * per-player priority filter regardless, but returning keeps every candidate source in this
 * pipeline consistent and lets that filter's caller stay the single place anything is published.
 */
export async function buildWinnerConfirmedCandidates(
  req: PayloadRequest,
  championshipId: string,
  snapshots: LeaderboardSnapshotPair,
  saveNonce: string,
): Promise<TriggerCandidate[]> {
  const mainBefore = snapshots.before.main.filter((e) => !e.noReturn);
  const mainAfter = snapshots.after.main.filter((e) => !e.noReturn);
  if (isConcluded(mainBefore) || !isConcluded(mainAfter)) return [];

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

  const candidates: TriggerCandidate[] = [];

  for (const { competition, result } of jobs) {
    if (!result.winner || !result.winnerEntry) continue;

    // Main only: the drama of a genuine playoff gets its own announcement first ("it's going to
    // a playoff between X and Y"), then a second post for the result -- rather than jumping
    // straight to "winner confirmed" as if the tie never happened. Stableford/Scratch keep the
    // single result post; the site's own "playoff" framing is specifically about the Main title.
    if (competition === "main" && result.viaTiebreak && result.tiedEntries && result.tiedEntries.length >= 2) {
      const names = result.tiedEntries.map((e) => e.player.name);
      const { headline: playoffHeadline, body: playoffBody } = playoffCommentary(
        names,
        COMPETITION_LABEL[competition],
        scoreLabel(competition, result.tiedEntries[0]),
      );
      candidates.push({
        category: "playoff",
        championshipId,
        playerId: result.winner.id,
        playerName: result.winner.name,
        saveNonce: `${saveNonce}:${competition}:playoff-tie`,
        significance: { category: "playoff", inContention: true },
        post: {
          category: "playoff",
          competition,
          headline: playoffHeadline,
          body: playoffBody,
          championship: championshipId,
          scoreRelative: result.tiedEntries[0].toPar,
        },
      } satisfies TriggerCandidate);
    }

    const detail = competition === "main" && result.viaTiebreak ? playoffDetail(result, competition) : undefined;
    const { headline, body } = winnerConfirmedCommentary(result.winner.name, COMPETITION_LABEL[competition], scoreLabel(competition, result.winnerEntry), detail);
    candidates.push({
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
    } satisfies TriggerCandidate);

    // Two more championship-wide records, Main only -- mirror the Records page's "Largest margin
    // of victory" and "Lowest winning total in relation to par" / "Lowest score in a round by a
    // champion", checked the moment this year's own Main winner is confirmed.
    if (competition === "main" && result.winnerEntry.toPar !== undefined) {
      // Margin needs a clean, undisputed win by strokes -- a title decided by countback has no
      // real stroke margin to compare (mirrors computeAutoFacts' own !winner.tied gate).
      if (!result.viaTiebreak) {
        const runnerUp = mainAfter.find((e) => e.position === 2 && e.thru === "F");
        if (runnerUp?.toPar !== undefined) {
          const margin = runnerUp.toPar - result.winnerEntry.toPar;
          if (margin > 0) {
            const marginRecord = await getLargestMarginRecord(req, championshipId);
            if (marginRecord && margin > marginRecord.margin) {
              const { headline: mHeadline, body: mBody } = recordMarginCommentary(result.winner.name, margin, marginRecord.holderName, marginRecord.year);
              candidates.push({
                category: "record-margin",
                championshipId,
                playerId: result.winner.id,
                playerName: result.winner.name,
                saveNonce: `${saveNonce}:record-margin`,
                significance: { category: "record-margin", inContention: true },
                post: {
                  category: "record-margin",
                  competition: "main",
                  headline: mHeadline,
                  body: mBody,
                  championship: championshipId,
                  player: result.winner.id,
                  scoreRelative: result.winnerEntry.toPar,
                },
              } satisfies TriggerCandidate);
            }
          }
        }
      }

      const scoreRecord = await getLowestWinningScoreRecord(req, championshipId);
      if (scoreRecord && result.winnerEntry.toPar < scoreRecord.toParNett) {
        const { headline: sHeadline, body: sBody } = recordLowScoreCommentary(result.winner.name, result.winnerEntry.toPar, scoreRecord.holderName, scoreRecord.year);
        candidates.push({
          category: "record-low-score",
          championshipId,
          playerId: result.winner.id,
          playerName: result.winner.name,
          saveNonce: `${saveNonce}:record-low-score`,
          significance: { category: "record-low-score", inContention: true },
          post: {
            category: "record-low-score",
            competition: "main",
            headline: sHeadline,
            body: sBody,
            championship: championshipId,
            player: result.winner.id,
            scoreRelative: result.winnerEntry.toPar,
          },
        } satisfies TriggerCandidate);
      }
    }
  }

  return candidates;
}
