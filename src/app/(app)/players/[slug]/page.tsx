import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Trophy } from "lucide-react";

import { Container } from "@/components/shared/container";
import { SectionGrid } from "@/components/shared/section-grid";
import { RichTextBlock } from "@/components/shared/rich-text";
import { formatHandicap } from "@/lib/scoring";
import { PlaceholderArt } from "@/components/shared/placeholder-art";
import { CountryFlag } from "@/components/shared/country-flag";
import { ArticleCard } from "@/components/news/article-card";
import { PlayerGallery } from "@/components/players/player-gallery";
import { ResultsTab } from "@/components/players/results-tab";
import { StatsTab } from "@/components/players/stats-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getPlayerBySlug, getPlayerResults } from "@/lib/data/players";
import { getCompetitionLeaderboard } from "@/lib/data/scorecards";
import {
  getCareerNettScoringCategories,
  getCareerScratchScoringCategories,
  getCareerStreakCategories,
  getCareerDrivingCategories,
  getCareerApproachCategories,
  getCareerPuttingCategories,
} from "@/lib/data/career-statistics";
import { getTeeTimes } from "@/lib/data/tee-times";
import { getArticles } from "@/lib/data/articles";
import { getSiteTheme } from "@/lib/data/site-theme";
import { formatToPar } from "@/lib/leaderboard";
import type { Article } from "@/types/article";
import type { PlayerGalleryPhoto } from "@/types/player";
import { cn } from "@/lib/utils";

/** theopen.com's section__title: 14px Cardinal Photo, bold, uppercase over 1.6px, in #43524E. */
const SECTION_TITLE = "mb-5 font-menu text-[14px] font-bold uppercase leading-[16px] tracking-[1.6px] text-[#43524E]";

/**
 * theopen.com's player page content column: 1226px, which is their 1366 container less 70px inside
 * each edge -- 347px margins at 1920. Our Container already lands on 1366 (max-w-container 1430
 * less lg:px-8), so the extra 70 is all this adds. From xl only; below that the full container
 * width is used, as theopen.com's narrower layouts also drop the indent.
 */
const COLUMN = "xl:px-[70px]";

/** theopen.com's body copy: Founders Grotesk Light, 16px over 24px, #2a2a2a. */
const BODY_TEXT = "font-sans text-[16px] font-light leading-6 text-[#2a2a2a]";

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
  const player = await getPlayerBySlug(slug);
  if (!player) notFound();

  const [mainLeaderboard, teeTimeRounds, results, allArticles, theme, careerCategories] = await Promise.all([
    getCompetitionLeaderboard("main"),
    getTeeTimes(),
    getPlayerResults(player),
    getArticles(),
    getSiteTheme(),
    Promise.all([
      getCareerNettScoringCategories(),
      getCareerScratchScoringCategories(),
      getCareerStreakCategories(),
      getCareerDrivingCategories(),
      getCareerApproachCategories(),
      getCareerPuttingCategories(),
    ]).then(([nettCategories, scratchCategories, streakCategories, drivingCategories, approachCategories, puttingCategories]) => ({
      nettCategories,
      scratchCategories,
      streakCategories,
      drivingCategories,
      approachCategories,
      puttingCategories,
    })),
  ]);

  const entry = mainLeaderboard.find((e) => e.player.id === player.id);
  const winYears = results.filter((r) => r.finish === "Winner").map((r) => r.year);
  const debutYear = results.length > 0 ? Math.min(...results.map((r) => r.year)) : player.debutYear;

  // "1 - 2015, 2016" rather than just "Winner" -- makes a repeat best finish (e.g. winning twice) visible at a glance instead of collapsing to one word.
  //
  // Every year at the best position is listed, and the label takes the best of them: a player who
  // has finished both 2nd and T2 reads "2", with both years beside it, because he has been
  // outright second. Only a player whose every finish at that position was shared reads "T2".
  //
  // Labelling from the earliest year instead showed Robert Hamilton as "T2 - 2015, 2025" when his
  // 2025 was an outright second -- contradicted by his own bio further down the same page, which
  // is how it surfaced.
  // Only a completed round counts. A no-return still takes a position on the Main leaderboard --
  // ranked below everyone who finished, but a position all the same -- and in a small field that
  // can look better than a real finish from another year. Iain MacLeod read "T6 - 2016" off a
  // round he picked up in, ahead of the 8th he actually played to in 2013. A withdrawal is treated
  // the same way: Alastair Campbell's 2016 is not a result either.
  const completed = results.filter((r) => !r.main.noReturn && !r.main.withdrawn);
  const bestPosition = completed.length > 0 ? Math.min(...completed.map((r) => r.position)) : undefined;
  const bestFinishYears = completed.filter((r) => r.position === bestPosition).sort((a, b) => a.year - b.year);
  const finishedAlone = bestFinishYears.some((r) => !r.finish.startsWith("T"));

  // Nobody who has never completed a round has a best finish to show, so say what actually
  // happened instead: WD only when every appearance was a withdrawal, NR otherwise.
  const unfinishedYears = results.filter((r) => r.main.noReturn || r.main.withdrawn).sort((a, b) => a.year - b.year);
  const bestFinish =
    bestFinishYears.length > 0
      ? `${bestPosition === 1 ? "1" : `${finishedAlone ? "" : "T"}${bestPosition}`} - ${bestFinishYears.map((r) => r.year).join(", ")}`
      : unfinishedYears.length > 0
        ? `${unfinishedYears.every((r) => r.main.withdrawn) ? "WD" : "NR"} - ${unfinishedYears.map((r) => r.year).join(", ")}`
        : undefined;

  const statsYears = results
    .filter((r) => r.hasScorecards)
    .map((r) => ({ year: r.year, championshipId: r.championshipId }));

  const teeTimes = teeTimeRounds.flatMap((round) =>
    round.groups
      .filter((group) => group.players.some((p) => p.id === player.id))
      .map((group) => ({ round: round.round, date: round.date, time: group.time, tee: group.tee })),
  );

  const featuredArticleSlugs = player.featuredArticleSlugs ?? [];
  const featuredArticles: Article[] =
    featuredArticleSlugs.length > 0
      ? featuredArticleSlugs.map((articleSlug) => allArticles.find((a) => a.slug === articleSlug)).filter((a): a is Article => Boolean(a))
      : allArticles.slice(0, 3);

  // "<Name> at The Legs Open" shows the player's own gallery. A player with no gallery uploaded yet
  // borrows the photos from the articles tagged to them in the admin -- those are written about
  // them, so their pictures are of them. Never the untagged latest-articles fallback above, which
  // could be about anyone. Nothing to show either way and the band isn't rendered at all.
  const galleryPhotos: PlayerGalleryPhoto[] =
    (player.gallery ?? []).length > 0
      ? (player.gallery ?? [])
      : featuredArticleSlugs.length > 0
        ? featuredArticles.filter((a) => a.imageUrl).map((a) => ({ imageUrl: a.imageUrl, caption: a.title }))
        : [];

  const stats: { label: string; value: string | number }[] = [
    { label: "Age", value: player.ageAtChampionship ?? "—" },
    ...(player.turnedPro ? [{ label: "Turned Pro", value: player.turnedPro }] : []),
    ...(debutYear ? [{ label: "Legs Open Debut", value: debutYear }] : []),
    { label: "Championship Handicap", value: player.championshipHandicap === undefined ? "—" : formatHandicap(player.championshipHandicap) },
    // player.previousOpens is the hand-maintained pre-digital-era count; results (already
    // filtered to concluded championships) covers every digital-era Legs Open this player has a
    // real scorecard for, one-for-one with what the Results tab below lists -- including the
    // year that just concluded, not just the ones before it. A player with no completed
    // appearances at all correctly shows 0; one with a single completed appearance shows 1, not
    // 0 -- it already happened, so it already counts. Updates itself as each new year concludes.
    { label: "Previous Opens", value: player.previousOpens + results.length },
    ...(bestFinish ? [{ label: "Best Legs Open Finish", value: bestFinish }] : []),
  ];

  const [firstName, ...rest] = player.name.split(" ");
  const surname = rest.join(" ");

  return (
    <>
      {/* ---- Desktop hero (xl, 1280px+): theopen.com's player hero, measured off
          /players/padraig-harrington. Their whole page sits in a 1226px column -- a 1366
          container with 70px inside each edge, so 347px margins at 1920 -- and ours does the same
          via COLUMN. Inside it: a 430px navy band, stats vertically centred on the left (375px
          max, 125px items behind a gold rule), the portrait in a 540x528 frame standing 55px below
          the band's foot, the jug 450px square 40px from the top, and the Champion Golfer block on
          the right edge. The white name block then rides 56px up over the band -- see below.
          Positions are percentages of the 1366 box (598/1366 and 1076/1366, i.e. 528 and 1006 into
          the 1226 column plus its 70px indent) so they land exactly at 1920 and
          close up proportionally at 1280. Below xl the stacked layout further down is used. ---- */}
      <section className="relative hidden w-full overflow-hidden bg-primary text-primary-foreground xl:block">
        <div className="relative h-[430px]">
          <Container className="h-full">
            <div className={cn(COLUMN, "relative flex h-full items-center justify-between")}>
              {winYears.length > 0 && theme.championTrophyGraphicUrl ? (
                <div className="pointer-events-none absolute left-[78.77%] top-10 h-[450px] w-[450px]" aria-hidden="true">
                  <PlaceholderArt label="" imageUrl={theme.championTrophyGraphicUrl} tone="navy" blendBlack fill fit="contain-bottom" sizes="450px" />
                </div>
              ) : null}
              <div className="pointer-events-none absolute -bottom-[55px] left-[43.78%] h-[528px] w-[540px]">
                <PlaceholderArt
                  label={`${player.name} portrait`}
                  imageUrl={player.photoUrl}
                  tone="slate"
                  blendBlack
                  fill
                  fit="contain-bottom"
                  sizes="540px"
                  priority
                />
              </div>

              {/* `relative` on both blocks so they paint above the absolutely positioned portrait,
                  as theirs do (their photo sits at z-index -20 behind the text). */}
              {/* 400 rather than their 375: they show three stats, we show five, and "Championship"
                  is a single word wider than their 87px label -- at 375 that pushed every row down to
                  two. 400 keeps three then two. */}
              <dl className="relative flex max-w-[400px] flex-wrap gap-y-5">
                {stats.map((stat) => (
                  <div key={stat.label} className="flex min-h-[80px] min-w-[125px] flex-col border-l-2 border-accent pl-3 pr-[25px]">
                    {/* Labels wrap as theirs do ("Legs Open / Debut"). 90 rather than their 87: a
                        wrapping label fills its max width, which sets the item's, so this is what
                        keeps three to a row. "Championship" (114px, one word) runs 24px past it,
                        inside the 25px right padding rather than into the next stat. */}
                    <dt className="mb-[10px] max-w-[90px] font-menu text-[14px] uppercase leading-[16px] tracking-[0.6px]">{stat.label}</dt>
                    <dd className="mt-auto whitespace-nowrap font-menu text-[36px] uppercase leading-9 tracking-[1px]">{stat.value}</dd>
                  </div>
                ))}
              </dl>

              {winYears.length > 0 ? (
                <div className="relative mr-5 pr-[14px]">
                  <div className="flex min-h-[80px] max-w-[180px] flex-col border-l-2 border-accent px-[18px]">
                    <p className="mb-[10px] font-menu text-[14px] uppercase leading-[16px] tracking-[0.6px]">Champion Golfer of the Year</p>
                    {winYears.map((year) => (
                      <span key={year} className="font-menu text-[36px] uppercase leading-9 tracking-[1px]">
                        {year}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </Container>
        </div>

        {/* What their page actually shows: the navy stops in a hard edge 374px down -- 56px short
            of the 430 the stats are centred in -- with white below it, and the first name starts 6px
            under that edge. (Their markup carries a transparent-to-white gradient here too, but white
            pseudo-elements behind the name cover it, so it never shows.) Painting white from the
            edge is also what crops the portrait's foot, as theirs is cropped. */}
        {/* One white block for the name and the country together: as two, the 41.4px line height
            left a sub-pixel seam between them that let the section's navy show through as a line. */}
        <div className="relative -mt-[56px] bg-white pb-[30px] pt-[6px]">
          <Container>
            <div className={COLUMN}>
              <p className="font-menu text-[36px] leading-[41.4px] tracking-[1.8px] text-primary">{firstName}</p>
              {/* An h1 here and in the stacked name block below: only one is ever displayed (the
                  other is display:none), so the page always has exactly one heading in use. */}
              <h1 className="font-menu text-[80px] font-bold uppercase leading-[92px] tracking-[1.6px] text-primary">{surname}</h1>
              <p className="mt-[25px] flex items-center gap-2 font-menu text-[14px] leading-5 tracking-[0.2px] text-[#43524E]">
                <CountryFlag code={player.countryCode} className="h-[22px] !w-[30px]" />
                {player.country}
              </p>
            </div>
          </Container>
        </div>
      </section>

      <section className="relative w-full overflow-hidden bg-primary text-primary-foreground xl:hidden">
        {/* Fixed height only from lg up (430px) -- below that the grid stacks to a single column, and a fixed height would clip the stacked content. No breadcrumbs/eyebrow here by request, so this is just the stat/portrait/badge row, vertically centered in the banner. */}
        {/* No z-index here -- it would isolate the portrait's mix-blend-mode into its own stacking context, cutting it off from the section's own bg-primary it needs to blend against. Plain DOM order already paints this on top, so z-10 is unnecessary. */}
        {/* Desktop-only: anchored to the whole hero (not the badge column) so it reads as a full-height decorative element alongside the portrait, matching the earlier desktop treatment. Below lg there's no room for this, so the badge column gets its own smaller corner version instead. */}
        {/* The trophy is scaled with the portrait (both up from 240x300 to 352x440), keeping the
            proportions they had to each other before the hero grew to theopen.com's height. */}
        {winYears.length > 0 && theme.championTrophyGraphicUrl ? (
          <div className="pointer-events-none absolute bottom-0 right-0 hidden h-[440px] w-[352px] lg:block" aria-hidden="true">
            <PlaceholderArt label="" imageUrl={theme.championTrophyGraphicUrl} tone="navy" blendBlack fill sizes="352px" />
          </div>
        ) : null}
        {/* Laid out the way theopen.com's player hero is: the stats in a row on the left, each a
            14px uppercase Cardinal Photo label over a 36px value behind a gold rule, vertically
            centred; the cut-out portrait large and standing on the bottom edge; the Champion Golfer
            block centred on the right. Measured off /players/padraig-harrington at 1440. */}
        <Container className="relative flex h-auto items-end py-10 lg:h-[500px] lg:py-0">
          <div className="grid w-full gap-8 lg:h-full lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center lg:gap-10">
            <dl className="flex flex-wrap items-end gap-x-8 gap-y-6 lg:order-1">
              {stats.map((stat) => (
                <div key={stat.label} className="flex flex-col gap-3 border-l-2 border-accent pl-3">
                  <dt className="max-w-[120px] font-menu text-[14px] uppercase leading-[16px] tracking-[0.6px]">{stat.label}</dt>
                  <dd className="font-menu text-[28px] uppercase leading-none tracking-[1px] sm:text-[36px]">{stat.value}</dd>
                </div>
              ))}
            </dl>

            <div className="order-first flex justify-center lg:order-2 lg:h-full lg:items-end">
              {/* Below lg, sized as a fraction of the column's own width (capped) rather than a
                  flat pixel value -- a flat 180px looks fine on a narrow phone but reads as a tiny
                  island adrift in empty space on a wide one (e.g. a 480px-wide "Ultra"-class
                  phone), since the box never grows to match the extra room. */}
              <div className="relative aspect-[3/4] w-[55%] max-w-[260px] sm:max-w-[300px] lg:aspect-auto lg:h-[440px] lg:w-[352px] lg:max-w-none">
                <PlaceholderArt
                  label={`${player.name} portrait`}
                  imageUrl={player.photoUrl}
                  tone="slate"
                  blendBlack
                  fill
                  sizes="(min-width: 1024px) 352px, (min-width: 640px) 300px, 55vw"
                />
              </div>
            </div>

            {winYears.length > 0 ? (
              <div className="relative flex flex-col gap-3 border-l-2 border-accent pl-3 lg:order-3 lg:justify-self-end lg:pr-24">
                {/* Mobile/tablet only -- scoped to this column since there's no room for the full-hero desktop version below lg. Matches theopen.com's player pages, where the trophy stays visible (just smaller, tucked behind the champion text) on mobile too, instead of disappearing entirely. */}
                {theme.championTrophyGraphicUrl ? (
                  <div
                    className="pointer-events-none absolute -right-3 -top-4 h-[110px] w-[90px] sm:h-[140px] sm:w-[115px] lg:hidden"
                    aria-hidden="true"
                  >
                    <PlaceholderArt
                      label=""
                      imageUrl={theme.championTrophyGraphicUrl}
                      tone="navy"
                      blendBlack
                      fill
                      sizes="(min-width: 640px) 115px, 90px"
                    />
                  </div>
                ) : null}
                <div className="relative flex items-center gap-2">
                  {theme.championBadgeUrl ? (
                    // next/image: a 16x16 badge from a single admin upload at export size.
                    <Image
                      src={theme.championBadgeUrl}
                      alt=""
                      aria-hidden="true"
                      width={16}
                      height={16}
                      className="h-4 w-4 shrink-0 object-contain"
                    />
                  ) : (
                    <Trophy className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                  )}
                  <p className="max-w-[150px] font-menu text-[14px] uppercase leading-[16px] tracking-[0.6px]">Champion Golfer of the Year</p>
                </div>
                <div className="relative flex flex-col">
                  {winYears.map((year) => (
                    <span key={year} className="font-menu text-[28px] uppercase leading-none tracking-[1px] sm:text-[36px]">
                      {year}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </Container>
      </section>

      {/* theopen.com's name block: the first name at 36px regular over the surname at 80px bold,
          both Cardinal Photo, then the country at 14px in their #43524E. White, as the rest of
          their page is, rather than our grey page background. */}
      <section className="bg-white xl:hidden">
        <Container className="flex flex-col pb-6 pt-8 lg:pt-10">
          <p className="font-menu text-[28px] leading-[1.15] tracking-[1.8px] text-primary lg:text-[36px]">{firstName}</p>
          <h1 className="font-menu text-[48px] font-bold uppercase leading-[1.15] tracking-[1.6px] text-primary sm:text-[64px] lg:text-[80px]">
            {surname}
          </h1>
          <p className="mt-6 flex items-center gap-2 font-menu text-[14px] leading-5 tracking-[0.2px] text-[#43524E]">
            {/* !w: flag-icons' own `.fi` width (1.333em) loads after Tailwind and would otherwise
                win, leaving a 19px-wide flag stretched to 22px tall. 30x22 keeps the flags' 4:3. */}
            <CountryFlag code={player.countryCode} className="h-[22px] !w-[30px]" />
            {player.country}
          </p>
        </Container>
      </section>

      <Tabs defaultValue="overview" className="bg-white">
        {/* The same sub-page nav as Previous Opens (src/components/previous-opens/previous-open-view.tsx),
            which is theopen.com's: a white strip the full width of the window closed by a 1px
            #B9BEC0 rule, uppercase 15px Cardinal Photo labels, the active one #2269AB over a 3px
            underline of the same blue. */}
        <div className="w-full border-b border-[#B9BEC0] bg-white">
          <Container>
          <div className={COLUMN}>
            <TabsList className="h-[60px] gap-[30px] rounded-none bg-transparent p-0">
              {[
                { value: "overview", label: "Overview" },
                { value: "bio", label: "Bio" },
                { value: "results", label: "Results" },
                { value: "stats", label: "Stats" },
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
          </div>
          </Container>
        </div>

        <Container className="py-10 sm:py-14 xl:pb-14 xl:pt-[41px]">
        <div className={COLUMN}>
          <TabsContent value="overview" className="mt-0">
            {/* Tee times go in the sidebar. Each row is two short values with justify-between, so
                across the full 1361px container it read as a scattering of text rather than a list
                -- at 453px it closes up. The championship stats keep the main column. Either slot
                can be absent (no entry, no tee times) and the one that remains takes the main
                track on its own. */}
            <SectionGrid layout="main-side" className="gap-y-10">
              {entry ? (
                <div>
                  <p className={SECTION_TITLE}>This championship</p>
                  <dl className="grid grid-cols-2 gap-5 sm:grid-cols-4">
                    {[
                      { label: "Position", value: `${entry.tied ? "T" : ""}${entry.position}` },
                      { label: "To Par", value: entry.toPar !== undefined ? formatToPar(entry.toPar) : "—" },
                      { label: "Score", value: entry.score ?? "—" },
                      { label: "Thru", value: entry.thru },
                    ].map((stat) => (
                      <div key={stat.label} className="flex flex-col gap-3 border-l-2 border-accent pl-3">
                        <dt className="font-menu text-[14px] uppercase leading-[16px] tracking-[0.6px] text-[#43524E]">{stat.label}</dt>
                        <dd className="font-menu text-[36px] uppercase leading-none tracking-[1px] text-primary">{stat.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : (
                <p className={BODY_TEXT}>{player.name} is not currently in the field for this championship.</p>
              )}

              {teeTimes.length > 0 ? (
                <div>
                  <p className={SECTION_TITLE}>Tee times</p>
                  <ul className="flex flex-col divide-y divide-[#B9BEC0] border-y border-[#B9BEC0]">
                    {teeTimes.map((t, index) => (
                      <li key={index} className="flex items-center justify-between px-1 py-3 font-sans text-[16px] text-[#2a2a2a]">
                        <span className="font-medium">
                          {t.round} Round · {t.date}
                        </span>
                        <span className="tabular-nums text-[#43524E]">
                          {t.time} · {t.tee} tee
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </SectionGrid>
          </TabsContent>

          <TabsContent value="bio" className="mt-0">
            {/* theopen.com's prose: Founders Grotesk Light at 16px over 24px in #2a2a2a, held to a
                716px measure. The photos that used to sit beside this now have their own band
                below the tabs, as theirs do. */}
            <RichTextBlock data={player.bio} className={cn(BODY_TEXT, "max-w-[716px]")} />
          </TabsContent>

          <TabsContent value="results" className="mt-0">
            <ResultsTab results={results} />
          </TabsContent>

          <TabsContent value="stats" className="mt-0">
            <StatsTab playerId={player.id} careerCategories={careerCategories} years={statsYears} />
          </TabsContent>
        </div>
        </Container>
      </Tabs>

      <PlayerGallery title={`${player.name} at The Legs Open`} playerName={firstName} photos={galleryPhotos} />

      {featuredArticles.length > 0 ? (
        <section className="border-t border-[#B9BEC0] bg-[#F7F7F7]">
          <Container>
          <div className={cn(COLUMN, "flex flex-col items-center pb-16 sm:pb-20")}>
            {/* theopen.com's "More on The 155th Open": a small centred uppercase title with 55px
                above and below it, the cards, then a centred blue See More button. */}
            <h2 className={cn(SECTION_TITLE, "mb-0 py-[55px] text-center")}>More on {firstName}</h2>
            <SectionGrid layout="thirds" className="w-full sm:grid-cols-3">
              {featuredArticles.map((article) => (
                <ArticleCard key={article.slug} article={article} />
              ))}
            </SectionGrid>
            <Link
              href="/latest"
              className="mt-12 inline-flex items-center border border-[#2269AB] bg-[#2269AB] px-5 py-3 font-sans text-[17px] font-bold uppercase leading-[20px] tracking-[0.3px] text-white transition-colors hover:border-[#1b5689] hover:bg-[#1b5689] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2269AB] focus-visible:ring-offset-2"
            >
              See more
            </Link>
          </div>
          </Container>
        </section>
      ) : null}
    </>
  );
}
