import type { LeaderboardEntry } from "@/types/player";
import { PLAYERS } from "@/data/players";

function buildEntry(
  position: number,
  tied: boolean,
  playerIndex: number,
  rounds: number[],
): LeaderboardEntry {
  const player = PLAYERS[playerIndex];
  const total = rounds.reduce((sum, r) => sum + r, 0);
  const scoreToPar = total - 72 * rounds.length;
  return {
    position,
    tied,
    player,
    scoreToPar,
    thru: rounds.length >= 4 ? "F" : `${12 + rounds.length}`,
    rounds,
    total,
    favoritable: true,
  };
}

export const LEADERBOARD_ROUND_4: LeaderboardEntry[] = [
  buildEntry(1, false, 0, [68, 66, 70, 67]),
  buildEntry(2, true, 6, [69, 67, 69, 68]),
  buildEntry(2, true, 8, [70, 66, 68, 69]),
  buildEntry(4, false, 2, [69, 70, 67, 69]),
  buildEntry(5, true, 12, [71, 68, 69, 68]),
  buildEntry(5, true, 3, [70, 69, 68, 69]),
  buildEntry(7, false, 9, [72, 68, 68, 69]),
  buildEntry(8, true, 15, [70, 70, 69, 69]),
  buildEntry(8, true, 4, [69, 71, 70, 68]),
  buildEntry(10, false, 16, [71, 70, 70, 68]),
  buildEntry(11, false, 1, [70, 71, 71, 69]),
  buildEntry(12, true, 5, [72, 70, 70, 70]),
  buildEntry(12, true, 13, [71, 71, 71, 69]),
  buildEntry(14, false, 7, [73, 70, 70, 70]),
  buildEntry(15, false, 10, [72, 72, 71, 69]),
];

export const LEADERBOARD_ROUND_2: LeaderboardEntry[] = [
  buildEntry(1, false, 0, [68, 66]),
  buildEntry(2, false, 8, [70, 66]),
  buildEntry(3, true, 6, [69, 67]),
  buildEntry(3, true, 3, [70, 69]),
  buildEntry(5, false, 12, [71, 68]),
  buildEntry(6, true, 9, [72, 68]),
  buildEntry(6, true, 2, [69, 70]),
  buildEntry(8, false, 15, [70, 70]),
  buildEntry(9, false, 4, [69, 71]),
  buildEntry(10, true, 16, [71, 70]),
];
