import type { Metadata } from "next";

import { PlayerDetail } from "@/components/players/player-detail";
import { getPlayerBySlug } from "@/lib/data/players";

interface PlayerPageProps {
  params: Promise<{ slug: string }>;
}

// See src/app/(app)/latest/[slug]/page.tsx for why this returns [] instead of querying at build time.
export async function generateStaticParams() {
  return [];
}

// See the comment on src/app/(app)/page.tsx's own `revalidate` -- raised from 10s now that the
// per-hostname cache-splitting bug it worked around is fixed at the root (the domain redirect),
// and Supabase egress makes a 10s ceiling expensive to keep regardless. The Overview tab shows
// this player's live position/score for the active championship.
export const revalidate = 60;

export async function generateMetadata({ params }: PlayerPageProps): Promise<Metadata> {
  const { slug } = await params;
  const player = await getPlayerBySlug(slug);
  if (!player) return {};
  return {
    title: player.name,
    description: `${player.name} player profile — stats, bio and championship history for The Legs Open.`,
  };
}

export default async function PlayerPage({ params }: PlayerPageProps) {
  const { slug } = await params;
  return <PlayerDetail slug={slug} />;
}
