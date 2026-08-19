// On-course scoring app shell worker. Served from /score/sw.js so its default max scope is
// /score/ -- it can never intercept requests outside the scoring app, even if a fetch-handler
// bug slipped through. Deliberately dependency-free (no Workbox/serwist): this project's
// production build uses Turbopack, and the standard PWA libraries lean on a Webpack plugin for
// build-time precache-manifest injection, which is a real compatibility risk with Turbopack.
// Runtime-only caching sidesteps that entirely -- nothing here depends on the bundler.

const SHELL_CACHE = "legs-open-score-shell-v2";
const NAV_PATHS = new Set(["/score/login", "/score/play", "/score/groups"]);

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

  if (request.mode === "navigate" && NAV_PATHS.has(url.pathname)) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/score/") || url.pathname.startsWith("/fonts/") || url.pathname.startsWith("/icon-")) {
    event.respondWith(cacheFirst(request));
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
