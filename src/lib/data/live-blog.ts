import { getPayload } from "payload";
import type { PayloadRequest } from "payload";

import configPromise from "@/payload.config";
import { getActiveChampionship } from "@/lib/data/scorecards";
import { mapPlayer } from "@/lib/data/players";
import { DEFAULT_PUBLICATION_CONFIG, type PublicationConfig } from "@/lib/live-blog/publication-policy";
import type { Player } from "@/types/player";
import type { Player as PayloadPlayer } from "@/payload-types";

export type LiveBlogCategory =
  | "ace"
  | "albatross"
  | "eagle"
  | "nett-eagle"
  | "birdie"
  | "bogey"
  | "double-bogey"
  | "moving-up"
  | "charge"
  | "hot-streak"
  | "moving-down"
  | "trouble"
  | "leader-falters"
  | "challenge-falters"
  | "leader"
  | "tie"
  | "lead-extends"
  | "entering-contention"
  | "leaving-contention"
  | "pressure-moment"
  | "through"
  | "clubhouse-leader"
  | "best-gross-round"
  | "round-complete"
  | "winner-confirmed"
  | "playoff"
  | "no-return"
  | "last-group"
  | "championship"
  | "instagram";
export type LiveBlogCompetition = "main" | "stableford" | "scratch";

export interface LiveBlogEntry {
  id: string;
  category: LiveBlogCategory;
  competition?: LiveBlogCompetition;
  headline: string;
  body: string;
  instagramUrl?: string;
  player?: Player;
  holeNumber?: number;
  scoreRelative?: number;
  postedAt: string;
}

export interface LiveBlogPage {
  entries: LiveBlogEntry[];
  hasNextPage: boolean;
  nextPage: number | null;
}

const LIVE_BLOG_PAGE_SIZE = 40;

export async function getLiveBlogPosts(page = 1, limit = LIVE_BLOG_PAGE_SIZE, championshipId?: string): Promise<LiveBlogPage> {
  const payload = await getPayload({ config: configPromise });
  const championship = championshipId
    ? await payload.findByID({ collection: "championships", id: championshipId }).catch(() => undefined)
    : await getActiveChampionship(payload);
  if (!championship) return { entries: [], hasNextPage: false, nextPage: null };

  const result = await payload.find({
    collection: "live-blog-posts",
    where: { championship: { equals: championship.id } },
    sort: "-postedAt",
    limit,
    page,
    depth: 1,
  });

  return {
    entries: result.docs.map((doc) => ({
      id: String(doc.id),
      category: doc.category,
      competition: doc.competition ?? undefined,
      headline: doc.headline,
      body: doc.body,
      instagramUrl: doc.instagramUrl ?? undefined,
      player: typeof doc.player === "object" && doc.player ? mapPlayer(doc.player as PayloadPlayer) : undefined,
      holeNumber: doc.holeNumber ?? undefined,
      scoreRelative: doc.scoreRelative ?? undefined,
      postedAt: doc.postedAt,
    })),
    hasNextPage: result.hasNextPage,
    nextPage: result.nextPage ?? null,
  };
}

/**
 * Reads the "Live Blog Config" global, falling back to DEFAULT_PUBLICATION_CONFIG for any field
 * that hasn't been saved yet (a brand-new global before its first admin save). Pass `req` when
 * calling from inside the Scorecards afterChange hook so this reads within the same in-flight
 * transaction as the write that triggered it.
 */
export async function getLiveBlogConfig(req?: PayloadRequest): Promise<PublicationConfig> {
  const payload = req?.payload ?? (await getPayload({ config: configPromise }));
  const global = await payload.findGlobal({ slug: "live-blog-config", depth: 0, req }).catch(() => undefined);
  if (!global) return DEFAULT_PUBLICATION_CONFIG;
  return {
    enabled: global.enabled ?? DEFAULT_PUBLICATION_CONFIG.enabled,
    minimumSignificance: global.minimumSignificance ?? DEFAULT_PUBLICATION_CONFIG.minimumSignificance,
    cooldownSeconds: global.cooldownSeconds ?? DEFAULT_PUBLICATION_CONFIG.cooldownSeconds,
    maxPostsPerHour: global.maxPostsPerHour ?? DEFAULT_PUBLICATION_CONFIG.maxPostsPerHour,
  };
}
