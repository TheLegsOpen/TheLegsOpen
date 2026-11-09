import { unstable_cache } from "next/cache";

import type { Player } from "@/types/player";

/**
 * Cross-request cache for the expensive public read paths, backed by Vercel's Data Cache.
 *
 * Why this exists: almost every public page is force-dynamic (see the comment on
 * src/app/(app)/page.tsx -- Vercel's build machine can't reliably reach Supabase), so without a
 * data-level cache every page view re-reads from Postgres. A single player profile was rebuilding
 * every past year's leaderboard three times over (main/stableford/scratch, then again for playoffs
 * and career stats), each one pulling every scorecard at depth 2 -- tens of MB of Supabase egress
 * per render, which is what pushed the project past the free plan's 5 GB.
 *
 * Freshness comes from tags, not the timer: every collection's afterChange hook in
 * src/lib/revalidate.ts expires the matching tag immediately, so an admin save or a live score is
 * visible on the next request. The TTL is only the ceiling for writes that bypass Payload's hooks
 * (raw SQL, scripts -- see the memory note on SQL bypassing revalidation). Raise it off-season,
 * lower it if something keeps going stale.
 */
export const DATA_CACHE_SECONDS = Number(process.env.DATA_CACHE_SECONDS) || 3600;

export const DATA_TAGS = {
  championships: "data:championships",
  scorecards: "data:scorecards",
  players: "data:players",
  venues: "data:venues",
  teeTimes: "data:tee-time-rounds",
} as const;

export type DataTag = (typeof DATA_TAGS)[keyof typeof DATA_TAGS];

/** Everything a leaderboard is built from -- a change to any of these can change one. */
export const LEADERBOARD_TAGS: DataTag[] = [DATA_TAGS.championships, DATA_TAGS.scorecards, DATA_TAGS.players, DATA_TAGS.venues, DATA_TAGS.teeTimes];

// Keyed per deployment so a code change that alters a cached value's shape can never be served
// the old shape from a previous deploy. Costs one refill per query per deploy, which is still a
// tiny fraction of the one-read-per-render this replaces.
const BUILD_ID = process.env.VERCEL_GIT_COMMIT_SHA ?? "local";

/**
 * unstable_cache JSON-serialises the result, so `fn` must return plain data (no Map, Date or class
 * instances). It must also *throw* on a failed read rather than return an empty fallback --
 * a caught-and-swallowed error would otherwise be cached as a real empty result for the whole TTL.
 * Catch at the call site, outside the cached function.
 */
export function cachedQuery<A extends unknown[], R>(key: string, tags: DataTag[], fn: (...args: A) => Promise<R>): (...args: A) => Promise<R> {
  return unstable_cache(fn, [BUILD_ID, key], { revalidate: DATA_CACHE_SECONDS, tags });
}

/**
 * Drops the profile-only fields (rich-text bio, gallery, featured articles) from a Player that is
 * only being shown as a row in a leaderboard or stat table. Nothing outside the player's own
 * profile header reads them (that comes from getPlayerBySlug, which is not cached here), and
 * leaving them in made every cached leaderboard many times larger than its actual content.
 */
export function slimPlayer(player: Player): Player {
  return { ...player, bio: undefined, gallery: undefined, featuredArticleSlugs: undefined };
}
