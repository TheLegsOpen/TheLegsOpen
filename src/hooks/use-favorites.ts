"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "legs-open-favorite-players";

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // localStorage isn't available during SSR, so favorites can only be read
    // after mount; `hydrated` lets consumers avoid a flash of empty state.
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFavorites(JSON.parse(stored));
      } catch {
        setFavorites([]);
      }
    }
    setHydrated(true);
  }, []);

  const toggleFavorite = useCallback((playerId: string) => {
    setFavorites((prev) => {
      const next = prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId];
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isFavorite = useCallback((playerId: string) => favorites.includes(playerId), [favorites]);

  return { favorites, toggleFavorite, isFavorite, hydrated };
}
