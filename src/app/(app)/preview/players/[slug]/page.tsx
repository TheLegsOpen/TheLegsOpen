import { PlayerDetail } from "@/components/players/player-detail";

export const dynamic = "force-dynamic";

/** PREVIEW of /players/[slug] with change 21 (Overview standfirst). */
export default async function PlayerPreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PlayerDetail slug={slug} preview />;
}
