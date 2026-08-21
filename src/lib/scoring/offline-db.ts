import { openDB, type IDBPDatabase } from "idb";

/**
 * Local-first save queue for the on-course scoring app. Every hole entered writes here
 * immediately, synced to the server opportunistically (see use-offline-sync.ts) -- a scorer never
 * loses a hole to patchy course signal, and never has to wait for a network round trip to move on
 * to the next hole.
 *
 * Two stores: pending-holes (the actual queue, one row per scorecard+hole) and group-cache (a
 * snapshot of the server-provided group/player/hole-info data, so a page that reloads while
 * signal is merely weak-but-present can render immediately from cache rather than waiting on a
 * fresh server round trip -- this does NOT make a full page load work with zero connectivity at
 * all; that needs the app shell itself to be served from a service worker, which is Stage 3, not
 * this).
 */

const DB_NAME = "legs-open-scoring";
const DB_VERSION = 1;
const HOLES_STORE = "pending-holes";
const GROUP_CACHE_STORE = "group-cache";
const GROUP_CACHE_KEY = "current";

export interface PendingHole {
  key: string;
  scorecardId: string;
  holeNumber: number;
  strokes?: number;
  noReturn: boolean;
  updatedAt: number;
  synced: boolean;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB isn't available in this environment.");
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(HOLES_STORE)) {
          db.createObjectStore(HOLES_STORE, { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains(GROUP_CACHE_STORE)) {
          db.createObjectStore(GROUP_CACHE_STORE);
        }
      },
    });
  }
  return dbPromise;
}

function holeKey(scorecardId: string, holeNumber: number): string {
  return `${scorecardId}:${holeNumber}`;
}

export async function queueHoleUpdate(update: { scorecardId: string; holeNumber: number; strokes?: number; noReturn: boolean }): Promise<void> {
  const db = await getDb();
  const key = holeKey(update.scorecardId, update.holeNumber);
  const existing = await db.get(HOLES_STORE, key);
  // Re-marking an already-synced hole as unsynced re-sends it to the server, which re-fires
  // Scorecards' afterChange hook (generateLiveBlogPosts included) as if it were a brand new score
  // -- observed live: a duplicated "Save & Next Hole" call (double-tap, a re-mount picking the
  // hole back up, patchy signal prompting a retry) produced two live-blog posts for the same
  // real event. If the value genuinely hasn't changed since the last sync, there's nothing new to
  // send, so this is a no-op rather than requeuing identical data.
  if (existing?.synced && existing.strokes === update.strokes && existing.noReturn === update.noReturn) {
    return;
  }
  await db.put(HOLES_STORE, { ...update, key, updatedAt: Date.now(), synced: false } satisfies PendingHole);
}

export async function getAllHoles(): Promise<PendingHole[]> {
  const db = await getDb();
  return db.getAll(HOLES_STORE);
}

export async function getUnsyncedHoles(): Promise<PendingHole[]> {
  return (await getAllHoles()).filter((h) => !h.synced);
}

export async function markHolesSynced(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const db = await getDb();
  const tx = db.transaction(HOLES_STORE, "readwrite");
  for (const key of keys) {
    const existing = await tx.store.get(key);
    if (existing) await tx.store.put({ ...existing, synced: true });
  }
  await tx.done;
}

export async function cacheGroup<T>(group: T): Promise<void> {
  const db = await getDb();
  await db.put(GROUP_CACHE_STORE, group, GROUP_CACHE_KEY);
}

export async function getCachedGroup<T>(): Promise<T | undefined> {
  const db = await getDb();
  return db.get(GROUP_CACHE_STORE, GROUP_CACHE_KEY);
}

/** Test-only reset -- clears both stores so tests don't leak state into each other. */
export async function _resetForTests(): Promise<void> {
  const db = await getDb();
  await db.clear(HOLES_STORE);
  await db.clear(GROUP_CACHE_STORE);
}
