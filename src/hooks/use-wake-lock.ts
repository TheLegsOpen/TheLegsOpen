"use client";

import { useEffect, useRef } from "react";

/**
 * Keeps the screen from auto-locking while active, so a scorer isn't re-entering their passcode
 * between every hole out on the course. The wake lock is released by the browser whenever the tab
 * is backgrounded, so it's re-acquired on visibilitychange rather than once on mount.
 */
export function useWakeLock(active: boolean) {
  const lockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let cancelled = false;

    async function acquire() {
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) {
          void lock.release();
          return;
        }
        lockRef.current = lock;
      } catch {
        // Refused (low battery, permissions, etc.) -- scoring still works, screen just times out normally.
      }
    }

    void acquire();

    function handleVisibility() {
      if (document.visibilityState === "visible" && !lockRef.current) void acquire();
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      void lockRef.current?.release();
      lockRef.current = null;
    };
  }, [active]);
}
