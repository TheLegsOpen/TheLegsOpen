"use client";

import { useEffect } from "react";

/**
 * Best-effort -- the app is fully usable online without it, this just adds offline resilience.
 * Production only: in dev, Turbopack keeps JS chunk filenames stable across edits (no content
 * hash), so the service worker's CacheFirst strategy would keep serving pre-edit code after every
 * change until the cache was manually cleared. Registering only in production sidesteps that
 * entirely -- each real deploy gets new hashed filenames, so CacheFirst is safe there.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/score/sw.js", { scope: "/score/" }).catch(() => {});
    }
  }, []);

  return null;
}
