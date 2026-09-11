// On-course scoring app shell worker. Served from /score/sw.js so its default max scope is
// /score/ -- it can never intercept requests outside the scoring app, even if a fetch-handler
// bug slipped through. Deliberately dependency-free (no Workbox/serwist): this project's
// production build uses Turbopack, and the standard PWA libraries lean on a Webpack plugin for
// build-time precache-manifest injection, which is a real compatibility risk with Turbopack.
// Runtime-only caching sidesteps that entirely -- nothing here depends on the bundler.

const SHELL_CACHE = "legs-open-score-shell-v3";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== SHELL_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // writes (/api/scoring/save) always go straight to the network

  const url = new URL(request.url);

  if (url.pathname.startsWith("/api/")) return; // scoring API responses are never cached -- always live or fail honestly

  if (url.pathname === "/score/leaderboard") return; // deliberately uncached -- offline should read as "no connection", not stale standings

  // Content-hashed assets only. These can never go stale -- a new build changes the filename -- so
  // serving them from cache without asking the network is free.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/fonts/") || url.pathname.startsWith("/icon-")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Everything else under /score/: the pages themselves, and just as importantly the RSC payloads
  // Next fetches when you navigate back to one of them.
  //
  // Those payloads used to land in the branch above, because the only network-first rule required
  // request.mode === "navigate" and a client-side back navigation is a plain fetch of
  // /score/play?_rsc=..., not a document navigation. So the payload was cached on first load and
  // served from cache from then on: open the leaderboard, go back, and the card was whatever it had
  // been when first cached -- hole 1, empty -- while the real scores sat safely on the server.
  // Reported twice from the course before it was found.
  //
  // Network first, cache only as the offline fallback, which is what the cache was ever for here.
  if (url.pathname.startsWith("/score/")) {
    event.respondWith(networkFirst(request));
  }
});

async function networkFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    // ignoreVary matters here -- Next's RSC navigation responses carry a Vary header on
    // router-state request headers that a plain hard reload never resends, so a strict Vary
    // match would silently miss the very entry this fallback exists to serve.
    const cached = await cache.match(request, { ignoreVary: true });
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request, { ignoreVary: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}
