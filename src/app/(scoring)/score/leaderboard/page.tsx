import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getCompetitionLeaderboard } from "@/lib/data/scorecards";
import { ScoreboardView } from "@/components/scoring/scoreboard-view";

// No session check -- this is the same public data /leaderboard already shows on the main site,
// just in a simpler, mobile-first view so a scorer can check it without leaving the scoring app.
export default async function ScoreLeaderboardPage() {
  const [main, stableford, scratch] = await Promise.all([
    getCompetitionLeaderboard("main"),
    getCompetitionLeaderboard("stableford"),
    getCompetitionLeaderboard("scratch"),
  ]);

  return (
    <div className="flex min-h-screen flex-col gap-6 p-5">
      <header className="flex items-center gap-3">
        <Link href="/score/play" className="flex h-9 w-9 items-center justify-center rounded-full border border-primary-foreground/30 text-primary-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="font-display text-xl font-bold">Leaderboard</h1>
      </header>
      <ScoreboardView data={{ main, stableford, scratch }} />
    </div>
  );
}
