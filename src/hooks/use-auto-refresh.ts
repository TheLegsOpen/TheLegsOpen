"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Polls the current route's server data on an interval via router.refresh(), so pages showing
 * live competition data update without a manual reload. Mobile browsers routinely suspend JS
 * timers while backgrounded (locking the screen, switching apps) and don't reliably resume the
 * interval on return, so on top of the interval this also refreshes immediately whenever the tab
 * becomes visible again.
 *
 * Pass null (or 0) to turn polling off entirely, which is the normal state: the pages that use
 * this are only worth polling during a championship, and both of them are force-dynamic, so every
 * poll is a real server render rather than a cached hit. See isChampionshipInPlay in
 * lib/data/championships.ts for the window and for what polling all year actually cost. When off,
 * this does nothing at all -- no interval, and no refresh on regaining visibility either. A real
 * visit still renders live data; it is only a tab left open for a long time that can go stale,
 * which is the right trade outside the three days when scores are moving.
 */
export function useAutoRefresh(intervalMs: number | null) {
  const router = useRouter();

  useEffect(() => {
    if (!intervalMs) return;

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }, intervalMs);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router, intervalMs]);
}
