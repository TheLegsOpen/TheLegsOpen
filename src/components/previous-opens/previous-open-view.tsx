"use client";

import Link from "next/link";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlaceholderArt } from "@/components/shared/placeholder-art";
import { LeaderboardView } from "@/components/leaderboard/leaderboard-view";
import { TeeTimesView } from "@/components/tee-times/tee-times-view";
import { StatPreviewBoard } from "@/components/statistics/stat-preview-board";
import { LiveBlogFeed } from "@/components/live-blog/live-blog-feed";
import { formatToPar } from "@/lib/leaderboard";
import { formatDate } from "@/lib/utils";
import type { ChampionshipWinner } from "@/types/championship";
import type { AutoFacts } from "@/lib/data/records";
import type { RankedEntry, PlayoffResult } from "@/lib/data/playoffs";
import type { TeeTimeRound } from "@/types/championship";
import type { StatCategory } from "@/lib/statistics";
import type { HoleToughnessRow } from "@/lib/data/scoring-statistics";
import type { LiveBlogPage } from "@/lib/data/live-blog";
import type { Article } from "@/types/article";
import type { SponsorClock } from "@/lib/data/sponsor-clock";

export interface PreviousOpenResults {
  main: RankedEntry[];
  stableford: RankedEntry[];
  scratch: RankedEntry[];
  rounds: TeeTimeRound[];
  nettCategories: StatCategory[];
  scratchCategories: StatCategory[];
  streakCategories: StatCategory[];
  drivingCategories: StatCategory[];
  approachCategories: StatCategory[];
  puttingCategories: StatCategory[];
  toughestHolesNett: HoleToughnessRow[];
  toughestHolesScratch: HoleToughnessRow[];
  playoffs: PlayoffResult[];
  liveBlogPage: LiveBlogPage;
  featuredArticle: Article;
  clockConfig: SponsorClock;
}

/** Prose-style summary built entirely from deterministic facts (see computeAutoFacts) -- never invented, and this stays honest if some of those facts aren't known for a given year. */
function overviewStory(championship: ChampionshipWinner, autoFacts: AutoFacts | undefined): string[] {
  if (!championship.winnerName) return [];
  const paragraphs: string[] = [];

  const scoreLabel = championship.scoreToPar !== undefined ? `at ${formatToPar(championship.scoreToPar)}` : "";
  const marginLabel = championship.margin === "Playoff" ? "in a playoff" : championship.margin ? `by ${championship.margin} shot${championship.margin === "1" ? "" : "s"}` : "";
  paragraphs.push(
    `${championship.winnerName}${championship.winnerCountry ? ` (${championship.winnerCountry})` : ""} won the ${championship.year} Legs Open at ${championship.venueName} ${scoreLabel}${marginLabel ? `, ${marginLabel}` : ""}.`.replace(/\s+/g, " "),
  );

  if (autoFacts?.runnerUpName) {
    paragraphs.push(
      `${autoFacts.runnerUpName} was runner-up${autoFacts.runnerUpScore !== undefined ? ` on ${autoFacts.runnerUpScore}` : ""}.`,
    );
  }

  if (autoFacts?.ledOutrightAfter9) {
    paragraphs.push(`${championship.winnerName} led outright from the turn, holding the advantage all the way home.`);
  } else if (autoFacts?.deficitAfter9 !== undefined && autoFacts.deficitAfter9 > 0) {
    paragraphs.push(
      `${championship.winnerName} was ${autoFacts.deficitAfter9} shot${autoFacts.deficitAfter9 === 1 ? "" : "s"} back at the turn before completing the comeback.`,
    );
  }

  if (autoFacts?.largestLead) {
    paragraphs.push(
      `${autoFacts.largestLead.holderName}'s ${autoFacts.largestLead.margin}-shot lead after hole ${autoFacts.largestLead.afterHole} was the largest advantage anyone held all week.`,
    );
  }

  if (championship.stablefordWinnerName || championship.scratchWinnerName) {
    const others: string[] = [];
    if (championship.stablefordWinnerName) others.push(`${championship.stablefordWinnerName} took the Stableford title`);
    if (championship.scratchWinnerName) others.push(`${championship.scratchWinnerName} won Scratch`);
    paragraphs.push(`${others.join(", and ")}.`);
  }

  return paragraphs;
}

export function PreviousOpenView({
  championship,
  autoFacts,
  results,
}: {
  championship: ChampionshipWinner;
  autoFacts: AutoFacts | undefined;
  results: PreviousOpenResults | undefined;
}) {
  const story = overviewStory(championship, autoFacts);

  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="results">Results</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-8">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div className="flex flex-col gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
              {championship.date ? formatDate(championship.date) : championship.year}
            </span>
            <h1 className="font-display font-bold text-display-lg text-balance">{championship.venueName}</h1>
            {story.length > 0 ? (
              <div className="flex flex-col gap-3 text-base text-muted-foreground">
                {story.map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            ) : (
              <p className="text-lg text-muted-foreground">
                {championship.winnerName ? (
                  <>
                    Won by{" "}
                    {championship.winnerPlayerSlug ? (
                      <Link href={`/players/${championship.winnerPlayerSlug}`} className="font-semibold text-primary hover:underline">
                        {championship.winnerName}
                      </Link>
                    ) : (
                      <span className="font-semibold text-foreground">{championship.winnerName}</span>
                    )}
                    {championship.winnerCountry ? ` of ${championship.winnerCountry}` : null}
                  </>
                ) : (
                  "Championship not yet played."
                )}
              </p>
            )}
          </div>
          <PlaceholderArt
            label={championship.winnerName ? `${championship.winnerName} at ${championship.venueName}` : championship.venueName}
            tone="navy"
            ratio="4/3"
            showCaption
          />
        </div>

        <dl className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">
          {[
            { label: "Champion", value: championship.winnerName ?? "TBD" },
            { label: "Score", value: championship.scoreToPar !== undefined ? formatToPar(championship.scoreToPar) : "—" },
            { label: "Margin", value: championship.margin ?? "—" },
            { label: "Venue", value: championship.venueName },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col gap-1 border border-border p-4">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</dt>
              <dd className="font-display text-lg font-bold">{stat.value}</dd>
            </div>
          ))}
        </dl>

        <Link href={`/venues/${championship.venueSlug}`} className="mt-6 inline-block w-fit text-sm font-medium text-primary hover:underline">
          View {championship.venueName} →
        </Link>
      </TabsContent>

      <TabsContent value="results" className="mt-8">
        {!results ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
            <p className="font-display font-bold text-lg">Not yet recorded</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Full results for the {championship.year} Legs Open will appear here once this championship is marked Completed in the admin.
            </p>
          </div>
        ) : (
          <Tabs defaultValue="leaderboard">
            <TabsList>
              <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
              <TabsTrigger value="tee-times">Tee Times</TabsTrigger>
              <TabsTrigger value="statistics">Statistics</TabsTrigger>
              <TabsTrigger value="live-blog">Live Blog</TabsTrigger>
            </TabsList>

            <TabsContent value="leaderboard" className="mt-6">
              <LeaderboardView
                main={results.main}
                stableford={results.stableford}
                scratch={results.scratch}
                featuredArticle={results.featuredArticle}
                clockConfig={results.clockConfig}
                nettCategories={results.nettCategories}
                scratchCategories={results.scratchCategories}
                streakCategories={results.streakCategories}
                drivingCategories={results.drivingCategories}
                approachCategories={results.approachCategories}
                puttingCategories={results.puttingCategories}
              />
            </TabsContent>

            <TabsContent value="tee-times" className="mt-6">
              <TeeTimesView
                rounds={results.rounds}
                featuredArticle={results.featuredArticle}
                clockConfig={results.clockConfig}
                mainEntries={results.main}
                stablefordEntries={results.stableford}
                scratchEntries={results.scratch}
                nettCategories={results.nettCategories}
                scratchCategories={results.scratchCategories}
                streakCategories={results.streakCategories}
                drivingCategories={results.drivingCategories}
                approachCategories={results.approachCategories}
                puttingCategories={results.puttingCategories}
              />
            </TabsContent>

            <TabsContent value="statistics" className="mt-6">
              <StatPreviewBoard
                nettCategories={results.nettCategories}
                scratchCategories={results.scratchCategories}
                streakCategories={results.streakCategories}
                drivingCategories={results.drivingCategories}
                approachCategories={results.approachCategories}
                puttingCategories={results.puttingCategories}
                toughestHolesNett={results.toughestHolesNett}
                toughestHolesScratch={results.toughestHolesScratch}
                playoffs={results.playoffs}
                mainEntries={results.main}
                stablefordEntries={results.stableford}
                scratchEntries={results.scratch}
              />
            </TabsContent>

            <TabsContent value="live-blog" className="mt-6">
              <LiveBlogFeed
                initialEntries={results.liveBlogPage.entries}
                initialHasNextPage={results.liveBlogPage.hasNextPage}
                mainEntries={results.main}
                stablefordEntries={results.stableford}
                scratchEntries={results.scratch}
                nettCategories={results.nettCategories}
                scratchCategories={results.scratchCategories}
                streakCategories={results.streakCategories}
                drivingCategories={results.drivingCategories}
                approachCategories={results.approachCategories}
                puttingCategories={results.puttingCategories}
                championshipId={championship.id}
              />
            </TabsContent>
          </Tabs>
        )}
      </TabsContent>
    </Tabs>
  );
}
