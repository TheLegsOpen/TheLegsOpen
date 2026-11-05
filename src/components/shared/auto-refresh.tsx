"use client";

import { useAutoRefresh } from "@/hooks/use-auto-refresh";

/**
 * Renders nothing -- just drives useAutoRefresh from inside a Server Component page. null turns
 * polling off, so a page can hand the decision straight through from server data.
 */
export function AutoRefresh({ intervalMs }: { intervalMs: number | null }) {
  useAutoRefresh(intervalMs);
  return null;
}
