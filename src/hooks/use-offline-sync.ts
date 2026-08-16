"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getUnsyncedHoles, markHolesSynced } from "@/lib/scoring/offline-db";

const POLL_INTERVAL_MS = 15_000;

interface SaveResponse {
  applied: { scorecardId: string; holeNumber: number }[];
  rejected: { scorecardId: string; holeNumber: number; reason: string }[];
}

/**
 * Drives the offline queue (src/lib/scoring/offline-db.ts): fires a sync attempt on mount, on the
 * `online` event, whenever the tab becomes visible again, and on a ~15s foreground poll while the
 * tab stays open. Deliberately not the Background Sync API -- support for it is unreliable-to-
 * absent on iOS Safari, which this golf-course audience will include, so the primary mechanism has
 * to work with nothing more than "the tab is open," not a service worker background event.
 */
export function useOfflineSync() {
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const syncingRef = useRef(false);

  const refreshPendingCount = useCallback(async () => {
    const unsynced = await getUnsyncedHoles();
    setPendingCount(unsynced.length);
  }, []);

  const sync = useCallback(async () => {
    if (syncingRef.current) return;
    const unsynced = await getUnsyncedHoles();
    if (unsynced.length === 0) {
      setPendingCount(0);
      return;
    }

    syncingRef.current = true;
    setSyncing(true);
    try {
      const res = await fetch("/api/scoring/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: unsynced.map((h) => ({ scorecardId: h.scorecardId, holeNumber: h.holeNumber, strokes: h.strokes, noReturn: h.noReturn })),
        }),
      });

      if (res.status === 401) {
        setSessionExpired(true);
        return;
      }
      if (res.ok) {
        const body = (await res.json()) as SaveResponse;
        await markHolesSynced(body.applied.map((a) => `${a.scorecardId}:${a.holeNumber}`));
      }
      // Any other non-OK status (or a thrown network error, caught below) just leaves everything
      // queued -- the next trigger (poll/online/visibility) retries automatically. No error is
      // surfaced here; losing connectivity mid-round is the expected case this exists to survive.
    } catch {
      // offline -- leave queued, retry on the next trigger
    } finally {
      syncingRef.current = false;
      setSyncing(false);
      await refreshPendingCount();
    }
  }, [refreshPendingCount]);

  useEffect(() => {
    refreshPendingCount();
    sync();

    const interval = setInterval(sync, POLL_INTERVAL_MS);
    function handleOnline() {
      sync();
    }
    function handleVisibility() {
      if (document.visibilityState === "visible") sync();
    }
    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearInterval(interval);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [sync, refreshPendingCount]);

  return { pendingCount, syncing, sessionExpired, syncNow: sync };
}
