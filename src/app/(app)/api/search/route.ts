import { NextResponse } from "next/server";

import { getArticles } from "@/lib/data/articles";
import { getVenues } from "@/lib/data/venues";
import { getPlayers } from "@/lib/data/players";
import { playerSlug } from "@/lib/utils";
import type { SearchResult } from "@/components/layout/search-overlay";

/**
 * Backs the header search overlay -- a compact index of every published article, public venue and
 * player, fetched once when the overlay first opens and filtered client-side as the visitor types.
 * Same helpers the article, venue and player pages use, so every result links to a page that exists.
 */
export async function GET() {
  try {
    const [articles, venues, players] = await Promise.all([getArticles(), getVenues(), getPlayers()]);

    const entries: SearchResult[] = [
      ...articles.map((a) => ({ type: "Article" as const, title: a.title, href: `/latest/${a.slug}`, meta: a.category })),
      ...venues.map((v) => ({ type: "Venue" as const, title: v.name, href: `/venues/${v.slug}`, meta: v.location })),
      ...players.map((p) => ({ type: "Player" as const, title: p.name, href: `/players/${playerSlug(p)}`, meta: p.country })),
    ];

    return NextResponse.json(entries);
  } catch (error) {
    console.error("[api/search] failed to build index", error);
    return NextResponse.json([], { status: 503 });
  }
}
