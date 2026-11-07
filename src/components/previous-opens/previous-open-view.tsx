"use client";

import { Fragment } from "react";
import Link from "next/link";
import { PlayCircle } from "lucide-react";

import { Container } from "@/components/shared/container";
import { RichTextBlock } from "@/components/shared/rich-text";
import { OverviewVideo } from "@/components/previous-opens/overview-video";
import { SectionGrid } from "@/components/shared/section-grid";
import { PlaceholderArt } from "@/components/shared/placeholder-art";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeaderboardView } from "@/components/leaderboard/leaderboard-view";
import { TeeTimesView } from "@/components/tee-times/tee-times-view";
import { StatPreviewBoard } from "@/components/statistics/stat-preview-board";
import { LiveBlogFeed } from "@/components/live-blog/live-blog-feed";
import { formatToPar } from "@/lib/leaderboard";
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
  stablefordTitleHolderId?: string;
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
  /** The site's crest, recoloured to #08325A in place of the trophy icon on winner-confirmed posts. */
  logoUrl?: string;
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
      `${autoFacts.largestLead.holderName}'s ${autoFacts.largestLead.margin}-shot lead, ${autoFacts.largestLead.afterHole} holes in, was the largest advantage the leaderboard showed all week.`,
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
  relatedArticles = [],
}: {
  championship: ChampionshipWinner;
  autoFacts: AutoFacts | undefined;
  results: PreviousOpenResults | undefined;
  relatedArticles?: Article[];
}) {
  const story = overviewStory(championship, autoFacts);

  // One of the tagged pieces may be flagged as this championship's Overview. It is taken out of
  // the rail as well as rendered in the body: offering "Related: the thing you are reading" beside
  // itself is worse than offering nothing.
  const overviewArticle = relatedArticles.find((article) => article.isChampionshipOverview);
  const railArticles = relatedArticles.filter((article) => article !== overviewArticle);
  // The replay page needs a scored card AND a Championship tee time for each player -- without the
  // tee sheet there's no way to place a hole in time. A CompetitionEntry carries both, so this is
  // the same condition getChampionshipReplay applies, answered from data already on the page rather
  // than by asking the database again. Years still being backdated simply don't show the link.
  const hasReplay = Boolean(results?.main.some((entry) => entry.started && entry.teeTime));

  return (
    <Tabs defaultValue="overview">
      {/* The Open's sub-page nav: a strip the full width of the window, white, closed by a 1px
          #B9BEC0 rule, with the list itself held to the container. The active tab is #2269AB
          over a 3px underline of the same blue, and the labels are uppercase Cardinal Photo
          rather than the sentence-case UI tabs this was.

          Their list carries a 70px left indent with nothing in it -- vestigial, as far as the
          markup shows -- so ours starts at the container edge instead. */}
      <div className="w-full border-b border-[#B9BEC0] bg-white">
        <Container>
          <TabsList className="h-[60px] gap-[30px] rounded-none bg-transparent p-0">
            {[
              { value: "overview", label: "Overview" },
              { value: "results", label: "Results" },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="h-full rounded-none border-b-[3px] border-transparent px-0 pb-5 pt-[23px] font-menu text-[15px] font-bold uppercase leading-none tracking-[1.5px] text-[#43524E] shadow-none data-[state=active]:border-[#2269AB] data-[state=active]:bg-transparent data-[state=active]:text-[#2269AB] data-[state=active]:shadow-none"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Container>
      </div>

      {/* White behind the whole band, so the grey content block below reads as an inset panel
          rather than a full-width tint. Measured on theopen.com at a 1920 window: the page is
          white, and #F7F7F7 covers only the 1366 of content, leaving 270px of white down each
          side. Our container lands on the same 1366 at the same 270 -- max-w-container is 1430
          and lg:px-8 takes 64 off it -- so the band needs no width of its own. */}
      <div className="w-full bg-white">
      <Container className="flex flex-col gap-10 py-10 sm:py-14">
        <TabsContent value="overview" className="mt-8">
          {/* Prose beside a rail, the way The Open lays out a championship page: 888 and 478,
              sitting flush with no gutter between them, the gap made by padding inside each
              column instead -- 70px on the prose, 20px on the rail. Flush matters now that the
              panel is tinted: a 20px grid gap would draw a white stripe down the middle of it. */}
          <div className="bg-[#F7F7F7]">
          <SectionGrid layout="article" className="gap-0">
            {/* The Open sets this prose much larger than we did -- 21px at weight 300 over a
                37.38px line, with the opening paragraph lifted to 26px at 400 as a standfirst.
                Ours was 16px throughout. The first of our generated sentences is already the
                summary line (who won, where, by how much), so it takes the standfirst treatment
                and the rest follow as body. Colour is their #2a2a2a rather than our muted grey. */}
            <div className="flex flex-col gap-6 px-5 py-8 lg:px-[70px] lg:py-10">
              {championship.overviewStory ? (
                // Written in the admin, and when it is there it is the whole story -- the
                // generated sentences would only say the same things again underneath it. It also
                // outranks a flagged article, being the more specific instruction of the two:
                // someone wrote this for this championship and nothing else.
                <RichTextBlock
                  data={championship.overviewStory}
                  className="font-sans text-[21px] font-light leading-[37.38px] text-[#2a2a2a]"
                />
              ) : overviewArticle ? (
                // The write-up itself, standing as the overview. Its dek takes the standfirst
                // treatment the first generated sentence would have had, so the tab still opens
                // with one line saying what happened before the detail starts.
                <>
                  <p className="font-sans text-[26px] leading-[35.88px] text-[#2a2a2a]">{overviewArticle.dek}</p>
                  {championship.overviewVideoUrl ? <OverviewVideo url={championship.overviewVideoUrl} /> : null}
                  <RichTextBlock
                    data={overviewArticle.body}
                    className="font-sans text-[21px] font-light leading-[37.38px] text-[#2a2a2a]"
                  />
                  <Link
                    href={`/latest/${overviewArticle.slug}`}
                    className="w-fit font-menu text-[12px] font-bold uppercase tracking-[1.6px] text-primary hover:underline"
                  >
                    Read as an article →
                  </Link>
                </>
              ) : story.length > 0 ? (
                story.map((paragraph, i) => (
                  <Fragment key={i}>
                    <p
                      className={
                        i === 0
                          ? "font-sans text-[26px] leading-[35.88px] text-[#2a2a2a]"
                          : "font-sans text-[21px] font-light leading-[37.38px] text-[#2a2a2a]"
                      }
                    >
                      {paragraph}
                    </p>
                    {/* Under the standfirst, which is where The Open runs its player -- after the
                        line that says what happened, before the detail. */}
                    {i === 0 && championship.overviewVideoUrl ? <OverviewVideo url={championship.overviewVideoUrl} /> : null}
                  </Fragment>
                ))
              ) : (
                <p className="text-lg">
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

            {/* The rail. Tagged articles first, under The Open's own heading, then the two links
                that used to sit beneath the stat tiles -- ancillary to the story rather than part
                of it. The heading only appears when there is something under it, so a
                championship nobody has tagged yet shows the links alone rather than an empty
                "Related". */}
            <aside className="flex flex-col gap-6 px-5 pb-8 lg:py-10">
              {railArticles.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {/* Their heading is 12px Cardinal Photo at weight 400 over 2.4px of tracking --
                      lighter and wider than the bold 14px this was. */}
                  <p className="font-menu text-[12px] font-normal uppercase leading-[13.8px] tracking-[2.4px] text-[#2a2a2a]">Related</p>
                  {/* Each item is a 119x75 thumbnail beside the words, closed by a 1px #C2CCC2
                      rule. The words run as one sentence -- category above, then TITLE, a gold
                      slash, and the standfirst continuing inline -- which is why the dek sits
                      inside the title's span rather than on a line of its own. */}
                  <ul className="flex flex-col divide-y divide-[#C2CCC2] border-y border-[#C2CCC2]">
                    {railArticles.map((article) => (
                      <li key={article.slug}>
                        <Link href={`/latest/${article.slug}`} className="group flex items-start gap-4 py-[11px]">
                          <span className="relative h-[75px] w-[119px] shrink-0 overflow-hidden">
                            <PlaceholderArt
                              label={article.heroLabel}
                              imageUrl={article.imageUrl}
                              tone="navy"
                              fill
                              sizes="119px"
                            />
                          </span>
                          <span className="flex min-w-0 flex-col gap-1">
                            <span className="font-menu text-[10px] font-bold uppercase leading-[11.5px] tracking-[1.6px] text-[#43524E]">
                              {article.category}
                            </span>
                            <span className="font-menu text-[16px] font-bold uppercase leading-[19.2px] tracking-[1.6px] text-[#2a2a2a] group-hover:text-[#2269AB]">
                              {article.title}
                              <span className="px-[6px] font-normal text-accent" aria-hidden="true">
                                /
                              </span>
                              <span className="font-sans text-[16px] font-light normal-case leading-[19.2px] tracking-normal text-[#2a2a2a]">
                                {article.dek}
                              </span>
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="flex flex-col gap-3">
              <Link href={`/venues/${championship.venueSlug}`} className="w-fit text-sm font-medium text-primary hover:underline">
                View {championship.venueName} →
              </Link>
              {hasReplay ? (
                <Link href={`/previous-opens/${championship.year}/replay`} className="w-fit text-sm font-medium text-primary hover:underline">
                  Replay the {championship.year} leaderboard →
                </Link>
              ) : null}
              </div>
            </aside>
          </SectionGrid>
          </div>
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
              <div className="flex flex-wrap items-center justify-between gap-4">
                <TabsList>
                  <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
                  <TabsTrigger value="tee-times">Tee Times</TabsTrigger>
                  <TabsTrigger value="statistics">Statistics</TabsTrigger>
                  <TabsTrigger value="live-blog">Live Blog</TabsTrigger>
                </TabsList>
                {hasReplay ? (
                  <Link
                    href={`/previous-opens/${championship.year}/replay`}
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold uppercase tracking-wide text-accent-foreground transition-opacity hover:opacity-90"
                  >
                    <PlayCircle className="h-4 w-4" />
                    Replay the round
                  </Link>
                ) : null}
              </div>
  
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
                  stablefordTitleHolderId={results.stablefordTitleHolderId}
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
  
              {/* Leaderboard and Tee Times each carry their own dark band -- navy and dark grey --
                  because they are also whole pages elsewhere on the site. Statistics and the live
                  blog had none here, so the Results tab went dark, dark, light, light. Both take
                  bg-surface-dark, which is what their own standalone pages use, so a section looks
                  the same whether it is read here or on its own page. */}
              <TabsContent value="statistics" className="mt-6 bg-surface-dark p-6 text-surface-dark-foreground sm:p-8">
                <StatPreviewBoard
                  championshipYear={championship.year}
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
  
              <TabsContent value="live-blog" className="mt-6 bg-surface-dark p-6 text-surface-dark-foreground sm:p-8">
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
                  logoUrl={results.logoUrl}
                />
              </TabsContent>
            </Tabs>
          )}
        </TabsContent>
      </Container>
      </div>
    </Tabs>
  );
}
