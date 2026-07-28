import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { getActiveChampionship } from "@/lib/data/scorecards";
import { mapPlayer } from "@/lib/data/players";
import type { Player } from "@/types/player";
import type { Player as PayloadPlayer } from "@/payload-types";

export type LiveBlogCategory = "eagle" | "birdie" | "bogey" | "leader" | "round-complete" | "championship";

export interface LiveBlogEntry {
  id: string;
  category: LiveBlogCategory;
  headline: string;
  body: string;
  player?: Player;
  holeNumber?: number;
  postedAt: string;
}

export async function getLiveBlogPosts(): Promise<LiveBlogEntry[]> {
  const payload = await getPayload({ config: configPromise });
  const championship = await getActiveChampionship(payload);
  if (!championship) return [];

  const result = await payload.find({
    collection: "live-blog-posts",
    where: { championship: { equals: championship.id } },
    sort: "-postedAt",
    limit: 200,
    depth: 1,
  });

  return result.docs.map((doc) => ({
    id: String(doc.id),
    category: doc.category,
    headline: doc.headline,
    body: doc.body,
    player: typeof doc.player === "object" && doc.player ? mapPlayer(doc.player as PayloadPlayer) : undefined,
    holeNumber: doc.holeNumber ?? undefined,
    postedAt: doc.postedAt,
  }));
}
