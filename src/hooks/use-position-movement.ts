"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Places gained (positive) or lost (negative) by each player since the previous leaderboard
 * update, keyed by player id.
 *
 * "Since the last update" is the rule the user chose: during live scoring the page refreshes
 * every ten seconds (useAutoRefresh), and a player who climbs from 9th to 6th on that refresh
 * shows a green 3 until the next refresh moves them again or not at all. On a static page --
 * a finished championship, Previous Opens -- there is never a second update, so nothing shows.
 *
 * Fed the unfiltered competition list, so searching or "Favorites only" never reads as movement.
 */
export function usePositionMovement(entries: { player: { id: string }; position: number }[]): Map<string, number> {
  const previous = useRef<Map<string, number> | null>(null);
  const [movement, setMovement] = useState<Map<string, number>>(() => new Map());

  useEffect(() => {
    const current = new Map(entries.map((entry) => [entry.player.id, entry.position]));
    const before = previous.current;
    previous.current = current;
    if (!before) return;

    const moved = new Map<string, number>();
    for (const [id, position] of current) {
      const was = before.get(id);
      if (was !== undefined && was !== position) moved.set(id, was - position);
    }
    setMovement(moved);
  }, [entries]);

  return movement;
}
