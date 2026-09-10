import { cookies } from "next/headers";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getCompetitionLeaderboard, getPracticeLeaderboard } from "@/lib/data/scorecards";
import { ScoreboardView } from "@/components/scoring/scoreboard-view";
import { PracticeScoreboardView } from "@/components/scoring/practice-scoreboard-view";
import { verifyScoringSession, SCORING_SESSION_COOKIE } from "@/lib/scoring-session";
import { FinishRoundButton } from "@/components/scoring/finish-round-button";

// See the comment on src/app/(app)/page.tsx's own `revalidate` -- raised from 10s now that the
// per-hostname cache-splitting bug it worked around is fixed at the root (the domain redirect),
// and Supabase egress makes a 10s ceiling expensive to keep regardless.
// See src/app/(app)/page.tsx for why this is force-dynamic instead of revalidate = 60.
export const dynamic = "force-dynamic";

export default async function ScoreLeaderboardPage() {
  const cookieStore = await cookies();
  const session = await verifyScoringSession(cookieStore.get(SCORING_SESSION_COOKIE)?.value);

  const header = (
    <header className="flex items-center gap-3">
      <Link href="/score/play" className="flex h-9 w-9 items-center justify-center rounded-full border border-primary-foreground/30 text-primary-foreground">
        <ArrowLeft className="h-4 w-4" />
      </Link>
      <h1 className="font-display text-xl font-bold">Leaderboard</h1>
    </header>
  );

  // A practice round has no live blog, stats, or public leaderboard -- Stableford points among
  // that day's groups only, scoped to this session's own round rather than the site-wide
  // Main/Stableford/Scratch championship data below.
  if (session && !session.championshipId) {
    const stableford = await getPracticeLeaderboard(session.teeTimeRoundId);
    return (
      <div className="flex min-h-screen flex-col gap-6 p-5">
        {header}
        <PracticeScoreboardView entries={stableford} />
        <div className="mt-auto pt-4">
          <FinishRoundButton roundComplete={false} />
        </div>
      </div>
    );
  }

  const [main, stableford, scratch] = await Promise.all([
    getCompetitionLeaderboard("main"),
    getCompetitionLeaderboard("stableford"),
    getCompetitionLeaderboard("scratch"),
  ]);

  return (
    <div className="flex min-h-screen flex-col gap-6 p-5">
      {header}
      <ScoreboardView data={{ main, stableford, scratch }} />
      <div className="mt-auto pt-4">
        <FinishRoundButton roundComplete={false} />
      </div>
    </div>
  );
}
