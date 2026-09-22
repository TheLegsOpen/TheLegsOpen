import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Container } from "@/components/shared/container";
import { PageHero } from "@/components/shared/page-hero";
import { LeaderboardReplay } from "@/components/replay/leaderboard-replay";
import { getChampionshipReplay } from "@/lib/data/championship-replay";

// Same reasoning as the rest of the site's championship pages -- the underlying scorecards can
// change at any time while a year is being backdated or corrected.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ year: string }> }): Promise<Metadata> {
  const { year } = await params;
  return {
    title: `${year} Championship Replay — The Legs Open`,
    description: `Watch the ${year} Legs Open leaderboard unfold hole by hole.`,
  };
}

// The scorecards are read at request time; nothing to pre-render.
export function generateStaticParams() {
  return [];
}

export default async function ReplayPage({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  const parsed = Number(year);
  if (!Number.isFinite(parsed)) notFound();

  const replay = await getChampionshipReplay(parsed);
  if (!replay) notFound();

  return (
    <>
      <PageHero eyebrow={`${replay.year} · ${replay.venueName}`} title="Championship replay" />
      <Container className="py-8">
        <Link
          href={`/previous-opens/${replay.year}`}
          className="flex w-fit items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {replay.year}
        </Link>
      </Container>
      {/* Renders its own full-width dark section, so the board sits on the same surface as the
          live leaderboard rather than floating on the page background. */}
      <LeaderboardReplay replay={replay} />
    </>
  );
}
