import { revalidatePath } from "next/cache";

type PathSpec = string | { path: string; type: "layout" };

/**
 * `{ type: "layout" }` targets a dynamic segment (e.g. "/venues/[slug]") and revalidates every
 * page matching it, since we don't know which specific slug/year/key a given save affects.
 * Plain strings revalidate exactly one static route.
 */
function revalidate(paths: PathSpec[]) {
  for (const spec of paths) {
    if (typeof spec === "string") revalidatePath(spec);
    else revalidatePath(spec.path, spec.type);
  }
}

/**
 * True full-site invalidation — reserved for the handful of globals actually read by the root
 * layout (src/app/(app)/layout.tsx: SiteTheme, Sponsors, SocialLinks, CookieBannerSettings),
 * since those genuinely render on every single page via the header/footer/cookie banner.
 * Everything else should use one of the scoped helpers below so an edit only busts the ISR
 * cache for the pages that actually read that data, instead of the whole site tree.
 */
export function revalidateSite() {
  revalidatePath("/", "layout");
}

export function revalidateHome() {
  revalidate(["/"]);
}

/** Every fixed page whose <title>/description SEOSettings can override -- see globals/SEOSettings.ts. */
export function revalidateSeoSettings() {
  revalidate([
    "/",
    "/leaderboard",
    "/tee-times",
    "/records",
    "/statistics",
    "/field",
    "/venues",
    "/live-blog",
    "/latest",
    "/previous-opens",
    "/club",
    "/patrons-and-suppliers",
    "/careers",
    "/media",
    "/contact",
  ]);
}

export function revalidateCareersPage() {
  revalidate(["/careers"]);
}

export function revalidateContactPage() {
  revalidate(["/contact"]);
}

export function revalidateMediaPage() {
  revalidate(["/media"]);
}

/** Shown as the banner on every data-utility/listing page except the homepage and detail pages. */
export function revalidatePageBanners() {
  revalidate([
    "/field",
    "/latest",
    "/leaderboard",
    "/live-blog",
    "/records",
    "/statistics",
    { path: "/statistics/[key]", type: "layout" },
    "/tee-times",
    "/venues",
  ]);
}

export function revalidateSponsorClock() {
  revalidate([
    "/leaderboard",
    "/live-blog",
    "/",
    { path: "/previous-opens/[year]", type: "layout" },
    "/statistics",
    { path: "/statistics/[key]", type: "layout" },
    "/tee-times",
  ]);
}

export function revalidateChampionships() {
  revalidate([
    "/field",
    "/previous-opens",
    { path: "/previous-opens/[year]", type: "layout" },
    { path: "/players/[slug]", type: "layout" },
    "/records",
    "/sitemap.xml",
    { path: "/statistics/[key]", type: "layout" },
    "/venues",
    { path: "/venues/[slug]", type: "layout" },
  ]);
}

export function revalidateVenues() {
  revalidate(["/sitemap.xml", "/venues", { path: "/venues/[slug]", type: "layout" }]);
}

export function revalidatePlayers() {
  revalidate([
    "/field",
    { path: "/players/[slug]", type: "layout" },
    "/sitemap.xml",
    { path: "/venues/[slug]", type: "layout" },
  ]);
}

/**
 * The busiest hook on the site — every hole-by-hole score entered during a live championship
 * fires this. Scoped to just the pages that actually show scores/results, so it doesn't also
 * bust the careers/contact/media/legal/patrons pages on every single stroke entered.
 */
export function revalidateScorecards() {
  revalidate([
    "/leaderboard",
    "/live-blog",
    "/",
    { path: "/players/[slug]", type: "layout" },
    { path: "/previous-opens/[year]", type: "layout" },
    "/statistics",
    { path: "/statistics/[key]", type: "layout" },
    "/tee-times",
    { path: "/venues/[slug]", type: "layout" },
    "/score/leaderboard",
    "/admin-scoring",
  ]);
}

export function revalidateTeeTimeRounds() {
  revalidate([
    { path: "/players/[slug]", type: "layout" },
    { path: "/previous-opens/[year]", type: "layout" },
    "/tee-times",
  ]);
}

export function revalidateArticles() {
  revalidate([
    "/latest",
    { path: "/latest/[slug]", type: "layout" },
    "/leaderboard",
    "/live-blog",
    "/",
    { path: "/players/[slug]", type: "layout" },
    { path: "/previous-opens/[year]", type: "layout" },
    "/sitemap.xml",
    "/statistics",
    { path: "/statistics/[key]", type: "layout" },
    "/tee-times",
    { path: "/venues/[slug]", type: "layout" },
  ]);
}

export function revalidateLegalPages() {
  revalidate([{ path: "/legal/[slug]", type: "layout" }, "/sitemap.xml"]);
}

export function revalidateLiveBlogPosts() {
  revalidate(["/live-blog", "/", { path: "/previous-opens/[year]", type: "layout" }]);
}

/**
 * TournamentStatus and LiveBlogConfig aren't rendered directly — they're tuning knobs read by
 * the live-blog generation pipeline (src/lib/live-blog/generate.ts) — so scope to the pages
 * where generated live-blog content actually surfaces rather than the whole site.
 */
export function revalidateLiveBlogConfig() {
  revalidate(["/live-blog", "/"]);
}
