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
import { ToughestHolesBoard } from "@/components/statistics/toughest-holes-board";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getVenueBySlug } from "@/lib/data/venues";
import { getChampionshipsByVenueSlug, getUpcomingChampionships } from "@/lib/data/championships";
import { getPlayers } from "@/lib/data/players";
import { getArticles } from "@/lib/data/articles";
import { isActiveChampionshipVenue } from "@/lib/data/scorecards";
import { getToughestHoles } from "@/lib/data/scoring-statistics";

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
        <Container className="grid grid-cols-1 gap-5 py-12 lg:grid-cols-[minmax(0,834fr)_minmax(0,392fr)] lg:py-16">
          <div className="flex flex-col gap-3">
            <p className="flex items-center gap-2 font-sans text-[14px] uppercase tracking-[1.2px] text-[#43524E]">
              {venue.countryCode ? <CountryFlag code={venue.countryCode} className="h-3 w-[18px] shrink-0" /> : null}
              <span>{[venue.location, venue.region, venue.country].filter(Boolean).join(", ")}</span>
            </p>
            {venue.description ? (
              <p className="font-sans text-[26px] font-normal leading-[36.4px] tracking-[0.6px] text-[#06051E]">{venue.description}</p>
            ) : null}
          </div>

          {/* Only when there is somewhere to point at. An empty "Upcoming Venues" heading beside
              a course description would read as something that had failed to load. */}
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
          ) : null}
        </Container>
      </section>

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
