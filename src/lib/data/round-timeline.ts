import { parseTeeTimeMinutes } from "@/lib/data/scorecards";
import type { CompetitionEntry } from "@/lib/data/scorecards";

/**
 * Reconstructs where every player stood at each moment of a round, rather than after each hole.
 *
 * The distinction matters more than it sounds. A Legs Open field goes off in groups over half an
 * hour or more, so comparing two players "after twelve holes" compares two different times of day.
 * That's the right basis for some records -- who led after nine, and how far back the champion was
 * -- because those ask how players' rounds compare. It is the wrong basis for "largest lead by any
 * player", which asks what the leaderboard actually showed, and which nobody watching the golf
 * would recognise if it were computed hole-for-hole.
 *
 * No per-hole times were recorded for 2013-2026, so the moment a group walked off a green is
 * derived: the tee sheet says when they started, and a hole takes as long as its par suggests.
 * Modelled, not measured -- the order holes were completed in is exact, a given minute is an
 * estimate. The same model the championship replay runs on.
 *
 * From 2027 the times are recorded as scores are entered, at which point `holeClock` should prefer
 * the real timestamp and fall back to this model only for older years. That is the only change
 * needed here; everything downstream already works from minutes.
 */

/** Minutes a group takes to play a hole, by par. Matches the replay and the rerun scripts. */
const HOLE_MINUTES: Record<number, number> = { 3: 10, 4: 13, 5: 15 };

export interface LeadOnTheClock {
  holderName: string;
  margin: number;
  /** Holes the leader had played when the board showed this. */
  afterHole: number;
  /** Minutes past midnight, so a caller can print a clock time. */
  atMinutes: number;
}

/** "12:29" from minutes past midnight. */
export function clockLabel(minutes: number): string {
  const total = Math.round(minutes);
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * When this player finished each hole, in minutes past midnight.
 *
 * A real stamp wins wherever there is one, and re-anchors the model for the holes after it — so a
 * round that was scored live is measured, and a round that predates the stamps is estimated, and a
 * round that has both (a card part-entered live, part-filled afterwards) uses whichever it has for
 * each hole rather than throwing the good data away.
 */
function holeClock(entry: CompetitionEntry): number[] {
  const start = parseTeeTimeMinutes(entry.teeTime);
  let elapsed = Number.isFinite(start) ? start : 0;
  return entry.holes.map((hole) => {
    if (hole.recordedAtMinutes !== undefined) {
      elapsed = hole.recordedAtMinutes;
      return elapsed;
    }
    elapsed += HOLE_MINUTES[hole.par] ?? 13;
    return elapsed;
  });
}

interface TimedPlayer {
  name: string;
  /** Running score to par after each hole, null for a hole that was never completed. */
  cumulative: (number | null)[];
  at: number[];
  /** The moment this player left the leaderboard for good -- a pick-up, or a withdrawal. */
  outAt?: number;
}

function timeline(entry: CompetitionEntry): TimedPlayer {
  const at = holeClock(entry);
  const cumulative: (number | null)[] = [];
  let running = 0;
  let outAt: number | undefined;

  entry.holes.forEach((hole, i) => {
    if (outAt !== undefined) {
      cumulative.push(null);
      return;
    }
    // A pick-up ends the round as far as the leaderboard is concerned: from here the player shows
    // NR, not a score, so they stop being someone a lead is measured against.
    if (hole.noReturn) {
      outAt = at[i];
      cumulative.push(null);
      return;
    }
    if (hole.value === undefined) {
      cumulative.push(null);
      return;
    }
    running += hole.relative;
    cumulative.push(running);
  });

  return { name: entry.player.name, cumulative, at, outAt };
}

/**
 * The biggest gap between first and second that the leaderboard ever showed.
 *
 * Scanned minute by minute rather than hole by hole, which means a lead can grow while its holder
 * is sitting in the clubhouse and his rivals are still out on the course dropping shots. That is
 * not a flaw in the measurement -- it is what a lead is.
 */
export function largestLeadOnTheClock(entries: CompetitionEntry[]): LeadOnTheClock | undefined {
  const players = entries.filter((entry) => entry.started && !entry.withdrawn).map(timeline);
  const times = players.flatMap((p) => p.at);
  if (times.length === 0) return undefined;

  const from = Math.floor(Math.min(...times));
  const to = Math.ceil(Math.max(...times));
  let best: LeadOnTheClock | undefined;

  for (let minute = from; minute <= to; minute++) {
    const board: { name: string; value: number; thru: number }[] = [];
    for (const player of players) {
      if (player.outAt !== undefined && minute >= player.outAt) continue;
      let latest = -1;
      for (let i = 0; i < player.at.length; i++) {
        if (player.at[i] <= minute && player.cumulative[i] !== null) latest = i;
      }
      if (latest >= 0) board.push({ name: player.name, value: player.cumulative[latest] as number, thru: latest + 1 });
    }
    if (board.length < 2) continue;

    board.sort((a, b) => a.value - b.value);
    const margin = board[1].value - board[0].value;
    if (margin > (best?.margin ?? 0)) {
      best = { holderName: board[0].name, margin, afterHole: board[0].thru, atMinutes: minute };
    }
  }

  return best;
}
