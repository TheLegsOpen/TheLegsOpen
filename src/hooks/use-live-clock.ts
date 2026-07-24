"use client";

import { useEffect, useState } from "react";

/**
 * Same hydration-safe shape as useCountdown: null on the server and first
 * paint (server and client can't agree on "now"), then synced on mount.
 */
export function useLiveClock(intervalMs = 15000): Date | null {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs]);

  return now;
}
