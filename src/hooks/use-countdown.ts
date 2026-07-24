"use client";

import { useEffect, useState } from "react";

export interface CountdownValue {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isComplete: boolean;
}

function computeRemaining(targetIso: string): CountdownValue {
  const diff = new Date(targetIso).getTime() - Date.now();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isComplete: true };
  }
  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    isComplete: false,
  };
}

const INITIAL: CountdownValue = { days: 0, hours: 0, minutes: 0, seconds: 0, isComplete: false };

export function useCountdown(targetIso: string): CountdownValue {
  // Start from a static, SSR-safe value and compute the real countdown only
  // after mount, so the server-rendered markup and first client render match.
  const [value, setValue] = useState<CountdownValue>(INITIAL);

  useEffect(() => {
    // Sync immediately on mount (rather than waiting a full second for the
    // first tick), then keep ticking every second after.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValue(computeRemaining(targetIso));
    const interval = setInterval(() => setValue(computeRemaining(targetIso)), 1000);
    return () => clearInterval(interval);
  }, [targetIso]);

  return value;
}
