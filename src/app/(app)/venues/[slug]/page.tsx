import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { PageHero } from "@/components/shared/page-hero";
import { Container } from "@/components/shared/container";
import { CountryFlag } from "@/components/shared/country-flag";
import { StatBlock } from "@/components/venues/stat-block";
import { VenueGallery } from "@/components/venues/venue-gallery";
import { VenueChampions, type VenueChampion } from "@/components/venues/venue-champions";
import { VenueChampionshipCarousel } from "@/components/venues/venue-championship-carousel";
import { VenueChampionshipTimeline } from "@/components/venues/venue-championship-timeline";
import { ArticleCard } from "@/components/news/article-card";
import { OverviewVideo } from "@/components/previous-opens/overview-video";
import { ToughestHolesBoard } from "@/components/statistics/toughest-holes-board";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getVenueBySlug } from "@/lib/data/venues";
import { getChampionshipsByVenueSlug, getUpcomingChampionships } from "@/lib/data/championships";
import { getPlayers } from "@/lib/data/players";
import { getArticles } from "@/lib/data/articles";
import { isActiveChampionshipVenue } from "@/lib/data/scorecards";
import { getToughestHoles } from "@/lib/data/scoring-statistics";
import { cn } from "@/lib/utils";

interface VenuePageProps {
  params: Promise<{ slug: string }>;
}

// See src/app/(app)/latest/[slug]/page.tsx for why this returns [] instead of querying at build time.
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: VenuePageProps): Promise<Metadata> {
  const { slug } = await params;
  const venue = await getVenueBySlug(slug);
  if (!venue) return {};
  return { title: venue.name, description: venue.description };
}

export default async function VenueDetailPage({ params }: VenuePageProps) {
  const { slug } = await params;
  const venue = await getVenueBySlug(slug);
  if (!venue) notFound();

  const [championshipsRaw, players, allArticles, isActiveVenue, upcomingChampionships] = await Promise.all([
    getChampionshipsByVenueSlug(venue.slug),
    getPlayers(),
    getArticles(),
    isActiveChampionshipVenue(venue.slug),
    getUpcomingChampionships(3),
  ]);
  const championshipsHere = [...championshipsRaw].sort((a, b) => b.year - a.year);
  const championshipsChronological = [...championshipsRaw].sort((a, b) => a.year - b.year);

  // Derived from the championship records rather than the venue's own timesHosted/firstHosted/
  // lastHosted fields. Those are typed by hand and three of them are already wrong -- Southerness
  // says 2014 against a 2016 championship, Dundonald 2013 against 2014, Carnwath 2012 against
  // 2013 -- so reading them here would print a year that the Championship Years timeline further
  // down this same page contradicts. Nothing else on the site renders those three fields.
  //
  // Most courses have hosted exactly once, where "First Hosted 2025 / Last Hosted 2025" reads as
  // a bug rather than a fact, so a single hosting collapses to one line.
  const hostedYears = championshipsChronological.map((c) => c.year);
  const hostingFacts =
    hostedYears.length === 0
      ? []
      : hostedYears.length === 1
        ? [
            { label: "Times Hosted", value: "1" },
            { label: "Hosted", value: String(hostedYears[0]) },
          ]
        : [
            { label: "Times Hosted", value: String(hostedYears.length) },
            { label: "First Hosted", value: String(hostedYears[0]) },
            { label: "Last Hosted", value: String(hostedYears[hostedYears.length - 1]) },
          ];
  // A venue added before it has hosted anything has neither list, and reserving the second track
  // for it would leave exactly the 392 of empty tint this fallback exists to remove.
  const bandHasSidebar = upcomingChampionships.length > 0 || hostingFacts.length > 0;

  // Course scoring used to appear only while the venue was hosting, which meant a course the
  // society has played a dozen times showed nothing the rest of the year. A venue is far more
  // often between championships than hosting one, so it falls back to the last championship
  // actually played here -- the most recent completed one, since a championship scheduled but not
  // yet played has no scores to report. getToughestHoles with no id reads the active championship,
  // which is what the live case still wants.
  const lastPlayedHere = championshipsHere.find((c) => c.completed);
  const scoringYear = isActiveVenue ? undefined : lastPlayedHere?.year;
  const [toughestHolesNett, toughestHolesScratch] =
    isActiveVenue || lastPlayedHere
      ? await Promise.all([
          getToughestHoles("nett", isActiveVenue ? undefined : lastPlayedHere!.id),
          getToughestHoles("scratch", isActiveVenue ? undefined : lastPlayedHere!.id),
        ])
      : [[], []];

  const playerByName = new Map(players.map((player) => [player.name, player]));
  const championsByKey = new Map<string, VenueChampion>();
  for (const c of championshipsHere) {
    if (!c.winnerName) continue;
    const key = c.winnerPlayerSlug ?? c.winnerName;
    const existing = championsByKey.get(key);
    if (existing) {
      existing.years.push(c.year);
      existing.years.sort((a, b) => a - b);
    } else {
      championsByKey.set(key, {
        key,
        name: c.winnerName,
        slug: c.winnerPlayerSlug,
        photoUrl: c.winnerPhotoUrl ?? playerByName.get(c.winnerName)?.photoUrl,
        years: [c.year],
      });
    }
  }
  const champions = Array.from(championsByKey.values()).sort((a, b) => Math.max(...b.years) - Math.max(...a.years));

  const featuredArticleSlugs = venue.featuredArticleSlugs ?? [];
  const featuredArticles =
    featuredArticleSlugs.length > 0
      ? featuredArticleSlugs.map((articleSlug) => allArticles.find((a) => a.slug === articleSlug)).filter((a) => Boolean(a))
      : [];

  return (
    <>
      {/* 520 and a 58px Cardinal Photo title, measured off their own venue hero. Each of their
          page types sets this differently -- 70px on the venues index, 58 here, 36 on a
          championship -- so it is per-page rather than one treatment, which is why it goes
          through titleClassName rather than changing PageHero for everyone.

          The region eyebrow stays. Their hero carries nothing but the course name, but the region
          is real information and dropping it would be a content decision dressed up as a style
          one. */}
      <PageHero
        variant="photo"
        heightPx={520}
        imageLabel={venue.imageLabel}
        imageUrl={venue.imageUrl}
        eyebrow={venue.region}
        title={venue.name}
        titleClassName="font-menu text-[58px] font-normal leading-[62.06px] tracking-[1.6px] text-white"
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Venues", href: "/venues" }, { label: venue.name }]}
      />

      {/* The Open's band under a venue hero: the course's own blurb at 26px beside a short list
          of where the championship goes next, on a #F7F7F7 strip across the full width with the
          content held to 1366. Theirs splits 834 and 392, which is the ratio here; the gutter is
          our usual 20px rather than the 140 they leave between the two.

          The description used to sit under the hero at 18px as body copy. It is the first thing
          written about the course, so it reads as a standfirst rather than a paragraph -- which
          is how they set it.

          An inline grid rather than another SectionGrid token: 834:392 is used here and nowhere
          else, and five named proportions is already enough to have to remember. */}
      <section className="w-full bg-[#F7F7F7]">
        <Container className={cn("grid grid-cols-1 gap-5 py-12 lg:py-16", bandHasSidebar && "lg:grid-cols-[minmax(0,834fr)_minmax(0,392fr)]")}>
          <div className="flex flex-col gap-3">
            <p className="flex items-center gap-2 font-sans text-[14px] uppercase tracking-[1.2px] text-[#43524E]">
              {venue.countryCode ? <CountryFlag code={venue.countryCode} className="h-3 w-[18px] shrink-0" /> : null}
              <span>{[venue.location, venue.region, venue.country].filter(Boolean).join(", ")}</span>
            </p>
            {venue.description ? (
              <p className="font-sans text-[26px] font-normal leading-[36.4px] tracking-[0.6px] text-[#06051E]">{venue.description}</p>
            ) : null}
          </div>

          {/* The Open points this column at where the championship goes next. Ours is empty for
              most of the year -- there is nothing upcoming between the last championship being
              marked complete and the next one being created, which is the state every venue page
              is in right now -- and an empty third of a tinted band reads as a section that
              failed to load rather than one with nothing to say.

              So it falls back to this course's own hosting record, which every venue that has
              hosted always has. Same list treatment either way, so the band does not change shape
              when a championship is scheduled. A course that has never hosted gets neither, and
              the blurb keeps the full width. */}
          {upcomingChampionships.length > 0 ? (
            <div className="flex flex-col gap-3">
              <p className="font-menu text-[14px] font-bold uppercase leading-[16.1px] tracking-[1.2px] text-[#06051E]">Upcoming Venues</p>
              <ul className="flex flex-col divide-y divide-[#06051E]/15 border-y border-[#06051E]/15">
                {upcomingChampionships.map((championship) => (
                  <li key={championship.venueSlug}>
                    <Link
                      href={`/venues/${championship.venueSlug}`}
                      className="flex items-center justify-between gap-3 py-4 font-menu text-[16px] uppercase tracking-[1.2px] text-[#06051E] transition-colors hover:text-primary"
                    >
                      <span>{championship.venueName}</span>
                      <span className="font-sans text-[14px] font-bold tracking-[1.2px] text-[#2269AB]">{championship.year}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : hostingFacts.length > 0 ? (
            <div className="flex flex-col gap-3">
              <p className="font-menu text-[14px] font-bold uppercase leading-[16.1px] tracking-[1.2px] text-[#06051E]">Championship Record</p>
              <ul className="flex flex-col divide-y divide-[#06051E]/15 border-y border-[#06051E]/15">
                {hostingFacts.map((fact) => (
                  <li key={fact.label} className="flex items-center justify-between gap-3 py-4">
                    <span className="font-menu text-[16px] uppercase tracking-[1.2px] text-[#06051E]">{fact.label}</span>
                    <span className="font-sans text-[14px] font-bold tracking-[1.2px] text-[#2269AB]">{fact.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Container>
      </section>

      {/* The Open's film band: a dark full-bleed strip with the video on one side and a short
          piece of writing on the other, 1068 against 838 at 1920. Only renders with a link on the
          venue, so a course without one simply does not have this section.

          Theirs carries an editorial headline above the copy -- "One of the toughest" -- which is
          written per course and has no field here. Rather than invent one or repeat the course
          name, the panel runs the first paragraph of the overview on its own. Say if the headline
          is wanted and it is one more field. */}
      {venue.overviewVideoUrl ? (
        <section className="w-full bg-[#06051E]">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1068fr)_minmax(0,838fr)]">
            <OverviewVideo url={venue.overviewVideoUrl} className="bg-black" />
            {venue.overview.length > 0 ? (
              <div className="flex flex-col justify-center gap-4 px-6 py-10 sm:px-12 lg:px-16">
                <p className="font-sans text-[20px] font-normal leading-[28.57px] text-white">{venue.overview[0]}</p>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <Container className="flex flex-col gap-16 py-10 sm:py-14">

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="course-card">Course Statistics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="flex max-w-3xl flex-col gap-4 text-base leading-relaxed">
            {venue.overview.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </TabsContent>

          <TabsContent value="course-card" className="flex flex-col gap-8">
            {venue.stats.length > 0 ? <StatBlock stats={venue.stats} /> : null}
            {toughestHolesNett.length > 0 || toughestHolesScratch.length > 0 ? (
              <div className="bg-surface-dark text-surface-dark-foreground">
                <div className="flex flex-col gap-8 p-6">
                  {scoringYear ? (
                    <p className="text-sm text-surface-dark-foreground/60">
                      How the field scored here at the {scoringYear} Legs Open, the last championship played at {venue.name}.
                    </p>
                  ) : null}
                  <ToughestHolesBoard
                    title={scoringYear ? `Course Scoring - Nett (${scoringYear})` : "Course Scoring - Nett"}
                    rows={toughestHolesNett}
                  />
                  <ToughestHolesBoard
                    title={scoringYear ? `Course Scoring - Scratch (${scoringYear})` : "Course Scoring - Scratch"}
                    rows={toughestHolesScratch}
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Hole-by-hole course scoring appears here once {venue.name} has hosted a championship.
              </p>
            )}
          </TabsContent>
        </Tabs>

        {venue.gallery && venue.gallery.length > 0 ? <VenueGallery venueName={venue.name} photos={venue.gallery} /> : null}

        {featuredArticles.length > 0 ? (
          <div className="flex flex-col gap-6">
            <h2 className="font-display font-bold text-2xl">Featured Articles</h2>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
              {featuredArticles.map((article) => (
                <ArticleCard key={article!.slug} article={article!} />
              ))}
            </div>
          </div>
        ) : null}

        {championshipsChronological.length > 0 ? (
          <>
            <VenueChampionshipCarousel
              venueName={venue.name}
              entries={championshipsChronological.map((c) => ({
                year: c.year,
                winnerName: c.winnerName,
                winnerPlayerSlug: c.winnerPlayerSlug,
                margin: c.margin,
                photoUrl: c.winnerName ? c.winnerPhotoUrl ?? playerByName.get(c.winnerName)?.photoUrl : undefined,
              }))}
            />
            <VenueChampionshipTimeline
              venueName={venue.name}
              entries={championshipsChronological.map((c) => ({
                year: c.year,
                winnerName: c.winnerName,
                winnerPlayerSlug: c.winnerPlayerSlug,
                photoUrl: c.winnerName ? c.winnerPhotoUrl ?? playerByName.get(c.winnerName)?.photoUrl : undefined,
              }))}
            />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{venue.name} has not yet hosted a recorded championship in our archive.</p>
        )}

        <VenueChampions venueName={venue.name} champions={champions} />
      </Container>
    </>
  );
}
