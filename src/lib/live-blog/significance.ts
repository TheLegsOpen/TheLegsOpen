import type { LiveBlogPost } from "@/payload-types";

export type TriggerCategory = LiveBlogPost["category"];

/**
 * Categories whose significance is already high enough by construction that they should always
 * bypass the cooldown and max-posts-per-hour throttle (see publication-policy.ts) -- a genuine
 * lead change or the competition's winner being confirmed shouldn't ever be delayed behind a
 * quieter post from a moment earlier.
 */
export const CRITICAL_CATEGORIES: ReadonlySet<TriggerCategory> = new Set<TriggerCategory>([
  "leader",
  "tie",
  "pressure-moment",
  "winner-confirmed",
  "ace",
]);

export interface SignificanceInput {
  category: TriggerCategory;
  /** Whether the player this candidate is about is currently inside the top 10 of the relevant competition (or is the leader). Routine per-hole results (birdie/bogey) outside contention are the primary source of "spam" this exists to suppress. */
  inContention: boolean;
  /** 18 - holes completed at the time of this candidate, when known. Later holes raise the stakes of an otherwise ordinary result. */
  holesRemaining?: number;
  /** For movement categories, how many places were gained/lost. */
  positionsChanged?: number;
  /** For round-complete, the final position -- a top-3 finish is a bigger story than a mid-table one. */
  finishPosition?: number;
  /** Both "entering the top 5/10" and "a big gain/drop of places" publish under the same "moving-up"/"moving-down" DB category (see race-tracker.ts's MovementEventKind) -- this distinguishes them for significance purposes without needing a separate category. */
  movementKind?: "enter-top-5" | "enter-top-10" | "big-gain" | "big-drop";
}

/** Base significance per category, before the contention/closing-hole adjustments below -- deliberately not a flat re-statement of the spec's example table, but calibrated so the site's existing "good" posts (aces, eagles, in-contention birdies, all leaderboard-movement/race-tracker events, round completions, winner confirmation) clear the default minimumSignificance, while an ordinary bogey or birdie for a player with no realistic path to a result does not. */
const BASE_SIGNIFICANCE: Record<TriggerCategory, number> = {
  "winner-confirmed": 100,
  leader: 95,
  tie: 90,
  "pressure-moment": 85,
  "clubhouse-leader": 80,
  ace: 95,
  eagle: 80,
  "lead-extends": 55,
  "entering-contention": 60,
  "leaving-contention": 45,
  charge: 65,
  trouble: 50,
  "moving-up": 40,
  "moving-down": 40,
  through: 55,
  "round-complete": 45,
  birdie: 20,
  bogey: 12,
  "last-group": 100,
  championship: 100,
  instagram: 100,
};

const CLOSING_HOLE_BONUS_TIGHT = 20; // holesRemaining <= 3
const CLOSING_HOLE_BONUS_LOOSE = 10; // holesRemaining <= 5
const CONTENTION_BONUS = 25;
const BIG_MOVE_BONUS_PER_PLACE = 3;
const TOP_3_FINISH_BONUS = 20;
const MOVEMENT_KIND_BONUS: Record<NonNullable<SignificanceInput["movementKind"]>, number> = {
  "enter-top-5": 25,
  "enter-top-10": 15,
  "big-gain": 0,
  "big-drop": 0,
};

/**
 * Deterministic 0-100 significance score for one trigger candidate. Pure function -- no
 * database access -- so the same facts always produce the same score, and it's directly unit
 * testable (see significance.test.ts).
 */
export function computeSignificance(input: SignificanceInput): number {
  let score = BASE_SIGNIFICANCE[input.category] ?? 0;

  // Per-hole birdie/bogey are the two categories that fire regardless of the player's actual
  // chances -- everything else already implies some leaderboard significance by construction
  // (a "leaving contention" event only exists for a player who was in contention a moment ago).
  if (input.category === "birdie" || input.category === "bogey") {
    score += input.inContention ? CONTENTION_BONUS : 0;
  }

  if (input.holesRemaining !== undefined) {
    if (input.holesRemaining <= 3) score += CLOSING_HOLE_BONUS_TIGHT;
    else if (input.holesRemaining <= 5) score += CLOSING_HOLE_BONUS_LOOSE;
  }

  if (input.positionsChanged !== undefined && input.positionsChanged > 5) {
    score += Math.min(20, (input.positionsChanged - 5) * BIG_MOVE_BONUS_PER_PLACE);
  }

  if (input.movementKind) {
    score += MOVEMENT_KIND_BONUS[input.movementKind];
  }

  if (input.category === "round-complete" && input.finishPosition !== undefined && input.finishPosition <= 3) {
    score += TOP_3_FINISH_BONUS;
  }

  return Math.max(0, Math.min(100, score));
}

export function isCriticalCategory(category: TriggerCategory): boolean {
  return CRITICAL_CATEGORIES.has(category);
}

/**
 * Birdie and bogey are the only categories that can genuinely recur many times for the same
 * player in a round, so they're the only ones a cooldown meaningfully protects against. Every
 * other category (a lead change, entering/leaving contention, a big position swing, an eagle...)
 * already represents a one-off state change by construction -- it isn't a spam vector, so a flat
 * cooldown shouldn't hold it back just because it landed in the same burst of near-simultaneous
 * saves that real tee-time-staggered play regularly produces (several groups posting scores
 * within the same minute).
 */
const COOLDOWN_GATED_CATEGORIES: ReadonlySet<TriggerCategory> = new Set<TriggerCategory>(["birdie", "bogey"]);

export function bypassesCooldown(category: TriggerCategory): boolean {
  return isCriticalCategory(category) || !COOLDOWN_GATED_CATEGORIES.has(category);
}

/**
 * Only these four categories' commentary templates (see commentary.ts) actually cite a specific
 * hole by number -- e.g. "birdie at the 15th". Streak/momentum categories (moving-up, charge,
 * trouble...) also carry a holeNumber (the hole that triggered detection), but their copy
 * deliberately describes a run across multiple holes ("two straight holes", "3 in the last 4")
 * rather than naming one, so fact-validation shouldn't require that number to appear literally.
 */
const HOLE_CITING_CATEGORIES: ReadonlySet<TriggerCategory> = new Set<TriggerCategory>(["ace", "eagle", "birdie", "bogey"]);

export function citesHoleNumber(category: TriggerCategory): boolean {
  return HOLE_CITING_CATEGORIES.has(category);
}
