"use client";

import { useAutoRefresh } from "@/hooks/use-auto-refresh";

/** Renders nothing -- just drives useAutoRefresh from inside a Server Component page. */
export function AutoRefresh({ intervalMs }: { intervalMs: number }) {
  useAutoRefresh(intervalMs);
  return null;
}
