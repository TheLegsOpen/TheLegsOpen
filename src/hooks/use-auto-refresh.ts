"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Polls the current route's server data on an interval via router.refresh(), so pages showing
 * live competition data update without a manual reload. Mobile browsers routinely suspend JS
 * timers while backgrounded (locking the screen, switching apps) and don't reliably resume the
 * interval on return, so on top of the interval this also refreshes immediately whenever the tab
 * becomes visible again.
 */
export function useAutoRefresh(intervalMs: number) {
  const router = useRouter();

  useEffect(() => {
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
