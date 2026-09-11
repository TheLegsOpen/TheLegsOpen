"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { forgetHoles, getUnsyncedHoles, markHolesSynced } from "@/lib/scoring/offline-db";

const POLL_INTERVAL_MS = 15_000;

/** Matches the reason saveScores sends when the group's session no longer checks out. Anything else
 * it rejects is a permanent refusal, not a retryable one. */
const SESSION_REJECTION = "session no longer valid -- log in again";

/**
 * Holes per request when flushing a backlog.
 *
 * The server applies updates one at a time, and every one fires Scorecards' afterChange hooks --
 * live-blog generation included, which runs its own leaderboard queries. A scorer who was out of
 * signal for nine holes comes back with 36 of them (four players x nine), and sending that as one
 * request risks outrunning the function timeout. Nothing would then be marked synced, so the next
 * attempt would send the same oversized batch and fail the same way: a backlog that can never
 * drain, which is the one failure this queue exists to prevent.
 *
 * Chunking makes the flush incremental instead of all-or-nothing. Each chunk that lands is marked
 * synced and never sent again, so progress is kept even if signal dies again part-way through.
 */
const SYNC_CHUNK_SIZE = 8;

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
      for (let i = 0; i < unsynced.length; i += SYNC_CHUNK_SIZE) {
        const chunk = unsynced.slice(i, i + SYNC_CHUNK_SIZE);
        const res = await fetch("/api/scoring/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            updates: chunk.map((h) => ({ scorecardId: h.scorecardId, holeNumber: h.holeNumber, strokes: h.strokes, noReturn: h.noReturn })),
          }),
        });

        if (res.status === 401) {
          setSessionExpired(true);
          return;
        }
        if (!res.ok) {
          // Stop here rather than pressing on: whatever stopped this chunk will most likely stop
          // the next. Everything not yet marked stays queued for the next trigger.
          break;
        }

        const body = (await res.json()) as SaveResponse;
        await markHolesSynced(body.applied.map((a) => `${a.scorecardId}:${a.holeNumber}`));

        // A hole the server says does not belong to this group is never going to be accepted:
        // typically one left over from a previous round on a phone now signed in to a different
        // group. Without this it stays unsynced and is re-sent on every trigger -- every 15 seconds,
        // all day, for a write that can only ever be refused. Dropping it is the only outcome that
        // ends.
        //
        // Session rejections are deliberately left queued: those become valid again once the scorer
        // logs back in, and sessionExpired above already sends them there.
        const permanentlyRejected = body.rejected
          .filter((r) => r.reason !== SESSION_REJECTION)
          .map((r) => `${r.scorecardId}:${r.holeNumber}`);
        if (permanentlyRejected.length > 0) await forgetHoles(permanentlyRejected);
        // Show the backlog draining chunk by chunk rather than jumping at the end.
        await refreshPendingCount();
      }
      // A thrown network error (caught below) leaves everything still unmarked queued -- the next
      // trigger (poll/online/visibility) retries automatically. No error is surfaced here; losing
      // connectivity mid-round is the expected case this exists to survive.
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
