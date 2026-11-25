import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Container } from "@/components/shared/container";
import { PageHero } from "@/components/shared/page-hero";
import { LeaderboardReplay, type FinalBoards } from "@/components/replay/leaderboard-replay";
import { getChampionshipReplay } from "@/lib/data/championship-replay";
import { getChampionshipByYear } from "@/lib/data/championships";
import { getCompetitionLeaderboardForChampionshipId, type CompetitionEntry } from "@/lib/data/scorecards";
import { applyPlayoffToEntries, getEligibleStablefordChampion, getPlayoffs } from "@/lib/data/playoffs";

/**
 * The boards as the year page shows them, playoff and tiebreak applied. The replay rebuilds every
 * minute from the cards, which ends a tied round level: "Final" over T1 Ferguson, T1 Campbell, with
 * the man who lost the playoff on top. At the last minute the replay shows these instead.
 * Players trimmed to what the table reads, as the replay's own are.
 */
async function getFinalBoards(year: number): Promise<FinalBoards | undefined> {
  const championship = await getChampionshipByYear(year);
  if (!championship?.completed) return undefined;
  const [main, stableford, scratch, playoffs] = await Promise.all([
    getCompetitionLeaderboardForChampionshipId(championship.id, "main"),
    getCompetitionLeaderboardForChampionshipId(championship.id, "stableford"),
    getCompetitionLeaderboardForChampionshipId(championship.id, "scratch"),
    getPlayoffs(championship.id),
  ]);
  const trim = (entries: CompetitionEntry[]): CompetitionEntry[] =>
    entries.map((e) => ({
      ...e,
      player: { id: e.player.id, name: e.player.name, country: e.player.country, countryCode: e.player.countryCode, previousOpens: e.player.previousOpens, bio: null } as CompetitionEntry["player"],
    }));
  const finalMain = applyPlayoffToEntries(main, playoffs.find((p) => p.competition === "main"));
  const finalStableford = applyPlayoffToEntries(stableford, playoffs.find((p) => p.competition === "stableford"));
  return {
    main: trim(finalMain),
    stableford: trim(finalStableford),
    scratch: trim(applyPlayoffToEntries(scratch, playoffs.find((p) => p.competition === "scratch"))),
    stablefordTitleHolderId: getEligibleStablefordChampion(finalMain, finalStableford)?.player.id,
  };
}

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

  const [replay, finalBoards] = await Promise.all([getChampionshipReplay(parsed), getFinalBoards(parsed)]);
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
      <LeaderboardReplay replay={replay} finalBoards={finalBoards} />
    </>
  );
}
