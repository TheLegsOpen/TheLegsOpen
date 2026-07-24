import { CHAMPIONSHIP_HISTORY } from "@/data/championships";
import { SITE } from "@/constants/site";
import { hashSeed, seededRandom } from "@/lib/utils";
import type { Player } from "@/types/player";

/**
 * Deterministically synthesizes a plausible 18-hole score-relative-to-par
 * sequence that sums to `relativeToPar`, for display only (the data model
 * doesn't track real hole-by-hole scores). Seeded so it's stable across
 * server and client renders.
 */
export function synthesizeHoleScores(relativeToPar: number, seedKey: string): number[] {
  const rand = seededRandom(hashSeed(seedKey) || 1);
  const order = Array.from({ length: 18 }, (_, i) => i).sort(() => rand() - 0.5);
  const holes = Array(18).fill(0);

  // A couple of canceling birdie/bogey pairs so even level-par rounds don't render as eighteen flat squares.
  holes[order[0]] -= 1;
  holes[order[1]] += 1;
  holes[order[2]] -= 1;
  holes[order[3]] += 1;

  let remaining = relativeToPar - holes.reduce((sum, value) => sum + value, 0);
  let i = 4;
  while (remaining !== 0 && i < 400) {
    const idx = order[i % 18];
    if (remaining > 0) {
      holes[idx] += 1;
      remaining -= 1;
    } else {
      holes[idx] -= 1;
      remaining += 1;
    }
    i++;
  }

  return holes;
}

export function holeScoreClass(relativeToPar: number): string {
  if (relativeToPar <= -1) return "bg-destructive";
  if (relativeToPar === 0) return "bg-primary";
  return "bg-muted-foreground/50";
}

export function formatToPar(value: number): string {
  if (value === 0) return "E";
  return value > 0 ? `+${value}` : `${value}`;
}

/**
 * Deterministically synthesizes a plausible "places moved since the last
 * update" value (the data model is a point-in-time snapshot, not a feed of
 * position changes). Seeded so it's stable across server/client renders.
 */
export function synthesizeMovement(seedKey: string): number {
  const rand = seededRandom(hashSeed(`${seedKey}-movement`) || 1);
  const magnitude = Math.round(rand() * 12);
  return rand() < 0.5 ? -magnitude : magnitude;
}

const ROTATION_VENUES = [
  "St Brennan's",
  "Seabrook Old Course",
  "Marram Bay Links",
  "Kirkwall Common",
  "Cormorant Point",
  "West Haven Links",
];

export interface PastResult {
  year: number;
  venueName: string;
  finish: string;
}

/**
 * Deterministically synthesizes `player.previousOpens` past-year results
 * (the data model doesn't track a full results history). Cross-references
 * CHAMPIONSHIP_HISTORY so a player's win, if any, shows up correctly.
 */
export function synthesizePastResults(player: Player): PastResult[] {
  if (player.previousOpens === 0) return [];

  const rand = seededRandom(hashSeed(`${player.id}-history`) || 1);
  const results: PastResult[] = [];

  for (let i = 1; i <= player.previousOpens; i++) {
    const year = SITE.currentYear - i;
    const historyEntry = CHAMPIONSHIP_HISTORY.find((entry) => entry.year === year);
    const venueName = historyEntry?.venueName ?? ROTATION_VENUES[year % ROTATION_VENUES.length];

    let finish: string;
    if (historyEntry?.winnerName === player.name) {
      finish = "Winner";
    } else if (rand() < 0.12) {
      finish = "CUT";
    } else {
      const position = Math.max(2, Math.round(rand() * 68));
      finish = rand() < 0.4 ? `T${position}` : `${position}`;
    }

    results.push({ year, venueName, finish });
  }

  return results;
}
