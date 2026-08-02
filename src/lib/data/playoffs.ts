import { getCompetitionLeaderboard } from "@/lib/data/scorecards";
import { formatToPar } from "@/lib/leaderboard";
import type { Competition, CompetitionEntry } from "@/lib/data/scorecards";
import type { Player } from "@/types/player";

const COMPETITION_LABELS: Record<Competition, string> = { main: "Main", stableford: "Stableford", scratch: "Scratch" };

function holeRange(startHole: number, endHole: number): number[] {
  // startHole/endHole are 1-indexed and inclusive; returns 0-indexed array positions into CompetitionEntry.holes.
  return Array.from({ length: endHole - startHole + 1 }, (_, i) => startHole - 1 + i);
}

/**
 * Standard match-of-cards countback, in the club's own priority order (not the usual
 * back-9-first convention) -- narrows the tied group step by step until one player is left,
 * or exhausts every step and the title is genuinely shared.
 */
const TIEBREAK_STEPS: { label: string; description: string; holeIndices: number[] }[] = [
  { label: "First Tiebreaker", description: "Holes 1, 2, 17 & 18", holeIndices: [0, 1, 16, 17] },
  { label: "Second Tiebreaker", description: "Holes 10–18", holeIndices: holeRange(10, 18) },
  { label: "Third Tiebreaker", description: "Holes 13–18", holeIndices: holeRange(13, 18) },
  { label: "Fourth Tiebreaker", description: "Holes 16–18", holeIndices: holeRange(16, 18) },
  { label: "Fifth Tiebreaker", description: "Hole 18", holeIndices: holeRange(18, 18) },
  { label: "Sixth Tiebreaker", description: "Holes 1–9", holeIndices: holeRange(1, 9) },
  { label: "Seventh Tiebreaker", description: "Holes 4–9", holeIndices: holeRange(4, 9) },
  { label: "Eighth Tiebreaker", description: "Holes 7–9", holeIndices: holeRange(7, 9) },
  { label: "Ninth Tiebreaker", description: "Hole 9", holeIndices: holeRange(9, 9) },
];

export interface TiebreakStepResult {
  label: string;
  description: string;
  /** Every player still in contention going into this step, with their score over this step's holes. */
  contenders: { player: Player; display: string; value: number }[];
  /** The subset of contenders who tied for best over this step's holes -- carries on to the next step. */
  survivors: Player[];
}

export interface PlayoffResult {
  competition: Competition;
  competitionLabel: string;
  steps: TiebreakStepResult[];
  winner?: Player;
  /** True if every step was exhausted and the players are still level -- a genuinely shared title. */
  stillTied: boolean;
}

/** The round only has a final result once nobody who teed off is still out on course. */
function isConcluded(entries: CompetitionEntry[]): boolean {
  const started = entries.filter((entry) => entry.started);
  return started.length > 0 && started.every((entry) => entry.thru === "F");
}

function resolveTiebreak(
  tied: CompetitionEntry[],
  competition: Competition,
): { steps: TiebreakStepResult[]; winner?: Player; stillTied: boolean } {
  // Stableford is points (higher wins); Main/Scratch are strokes-to-par (lower wins).
  const higherIsBetter = competition === "stableford";
  let contenders = tied;
  const steps: TiebreakStepResult[] = [];

  for (const step of TIEBREAK_STEPS) {
    const scored = contenders.map((entry) => ({
      entry,
      value: step.holeIndices.reduce((total, i) => total + (entry.holes[i]?.relative ?? 0), 0),
    }));
    const best = higherIsBetter ? Math.max(...scored.map((s) => s.value)) : Math.min(...scored.map((s) => s.value));
    const survivors = scored.filter((s) => s.value === best);

    steps.push({
      label: step.label,
      description: step.description,
      contenders: scored.map((s) => ({ player: s.entry.player, display: formatToPar(s.value), value: s.value })),
      survivors: survivors.map((s) => s.entry.player),
    });

    if (survivors.length === 1) {
      return { steps, winner: survivors[0].entry.player, stillTied: false };
    }
    contenders = survivors.map((s) => s.entry);
  }

  return { steps, stillTied: true };
}

/**
 * Only returns a result for a competition when it has actually finished with a tie for 1st --
 * this is the gate the UI uses to decide whether "Playoffs" appears at all.
 */
export async function getPlayoffs(): Promise<PlayoffResult[]> {
  const competitions: Competition[] = ["main", "stableford", "scratch"];
  const results: PlayoffResult[] = [];

  for (const competition of competitions) {
    const entries = await getCompetitionLeaderboard(competition);
    if (entries.length === 0 || !isConcluded(entries)) continue;

    // `tied` on the leaderboard also groups in not-started players, who share the same
    // baseline tieKey as a genuinely level-par finisher -- only players who actually posted
    // a score belong in a real tiebreak.
    const tied = entries.filter((entry) => entry.position === 1 && entry.tied && entry.started);
    if (tied.length < 2) continue;

    const { steps, winner, stillTied } = resolveTiebreak(tied, competition);
    results.push({ competition, competitionLabel: COMPETITION_LABELS[competition], steps, winner, stillTied });
  }

  return results;
}
