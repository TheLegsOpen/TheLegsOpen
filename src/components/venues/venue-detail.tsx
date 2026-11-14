import { notFound } from "next/navigation";
import Link from "next/link";

import { PageHero } from "@/components/shared/page-hero";
import { Container } from "@/components/shared/container";
import { VenueChampions, type VenueChampion } from "@/components/venues/venue-champions";
import { VenueChampionshipCarousel } from "@/components/venues/venue-championship-carousel";
import { OverviewVideo } from "@/components/previous-opens/overview-video";
import { getVenueBySlug } from "@/lib/data/venues";
import { getChampionshipHistory, getChampionshipsByVenueSlug, getUpcomingChampionships } from "@/lib/data/championships";
import { getSiteTheme } from "@/lib/data/site-theme";
import { getPlayers } from "@/lib/data/players";
import { getArticles } from "@/lib/data/articles";
import { loadCourseGuide } from "@/lib/data/course-guide";
import { cn, portraitUrl } from "@/lib/utils";
import { VenueCourseCard, VenueFeaturedArticle, VenueGalleryAll, VenueHeroLine } from "@/components/venues/venue-sections";

/**
 * The venue page at /venues/[slug]: the hero with its hosting line, the course blurb beside
 * Upcoming Venues and The Course, one featured article, the film band, every photo from here,
 * the championship strip and the champions. Course scoring lives on each Previous Opens page.
 */
export async function VenueDetail({ slug }: { slug: string }) {
  const venue = await getVenueBySlug(slug);
  if (!venue) notFound();

  const [championshipsRaw, players, allArticles, upcomingChampionships] = await Promise.all([
    getChampionshipsByVenueSlug(venue.slug),
    getPlayers(),
    getArticles(),
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
  // The Course card only once the course has at least one hole image -- the course page is a
  // strokesaver guide, and without pictures it is just the scorecard.
  const courseGuide = await loadCourseGuide(venue.slug, championshipsChronological);
  const showCourseCard = courseGuide.imageCount > 0;
  const bandHasSidebar = showCourseCard || upcomingChampionships.length > 0 || hostingFacts.length > 0;


  const playerByName = new Map(players.map((player) => [player.name, player]));
  // One card per champion who has won here, listing every Legs Open they have won anywhere -- as
  // theopen.com's Harrington card on the Carnoustie page reads 2007 and 2008, though 2008 was at
  // Birkdale. The portrait is the Champion Golfers card photo from their most recent win that has
  // one, so a repeat winner shows the same picture on every venue; failing that, the Champion
  // Photo from their latest win here, then their profile portrait.
  const allWins = (await getChampionshipHistory()).filter((c) => c.winnerName && c.year <= new Date().getFullYear());
  const championKey = (c: { winnerPlayerSlug?: string; winnerName?: string }) => c.winnerPlayerSlug ?? c.winnerName ?? "";
  const championsByKey = new Map<string, VenueChampion>();
  for (const c of championshipsHere) {
    if (!c.winnerName) continue;
    const key = championKey(c);
    if (championsByKey.has(key)) continue;
    const theirWins = allWins.filter((w) => championKey(w) === key).sort((a, b) => b.year - a.year);
    const player = playerByName.get(c.winnerName);
    championsByKey.set(key, {
      key,
      name: c.winnerName,
      slug: c.winnerPlayerSlug,
      countryCode: player?.countryCode,
      photoUrl: theirWins.find((w) => w.championCardPhotoUrl)?.championCardPhotoUrl ?? c.winnerPhotoUrl ?? portraitUrl(player?.photoUrl),
      years: theirWins.map((w) => w.year).sort((a, b) => a - b),
    });
  }
  const champions = Array.from(championsByKey.values()).sort((a, b) => Math.max(...b.years) - Math.max(...a.years));


  return (
    <>
      {/* 520 and a 58px Cardinal Photo title, measured off their own venue hero. Each of their
          page types sets this differently -- 70px on the venues index, 58 here, 36 on a
          championship -- so it is per-page rather than one treatment, which is why it goes
          through titleClassName rather than changing PageHero for everyone.

          Their hero carries nothing but the course name -- measured at 1920, the whole hero
          element reads "Carnoustie" and nothing else -- so the region eyebrow is gone. It was
          also the duplicate: the hero said "Aberdeen" and the band below said "Balmedie,
          Aberdeen, Scotland". The location is still in the page title, on the venues index and
          in the breadcrumb trail when that is switched on. */}
      <PageHero
        variant="photo"
        size="venue"
        imageLabel={venue.imageLabel}
        imageUrl={venue.imageUrl}
        title={venue.name}
        titleClassName="font-menu text-[58px] font-normal leading-[62.06px] tracking-[1.6px] text-white"
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Venues", href: "/venues" }, { label: venue.name }]}
        overlay={<VenueHeroLine venue={venue} championships={championshipsChronological} />}
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
          {/* No flag and no address line. Theirs carries neither -- the band is the blurb and
              the list, nothing else -- and ours was printing the region twice between here and
              the hero. */}
          <div className="flex flex-col gap-3">
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
          <div className="flex flex-col gap-8">
          {upcomingChampionships.length > 0 ? (
            <div className="flex flex-col gap-3">
              <p className="font-sans text-[14px] font-bold uppercase leading-[16.1px] tracking-[0.9px] text-[#43524E]">Upcoming Venues</p>
              <ul className="flex flex-col divide-y divide-[#06051E]/15 border-y border-[#06051E]/15">
                {upcomingChampionships.map((championship) => (
                  <li key={championship.venueSlug}>
                    <Link
                      href={`/venues/${championship.venueSlug}`}
                      className="flex items-center justify-between gap-3 py-4 font-menu text-[14px] font-bold uppercase leading-[16.1px] tracking-[1px] text-[#06051E] transition-colors hover:text-primary"
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
              <p className="font-sans text-[14px] font-bold uppercase leading-[16.1px] tracking-[0.9px] text-[#43524E]">Championship Record</p>
              <ul className="flex flex-col divide-y divide-[#06051E]/15 border-y border-[#06051E]/15">
                {hostingFacts.map((fact) => (
                  <li key={fact.label} className="flex items-center justify-between gap-3 py-4">
                    <span className="font-menu text-[14px] font-bold uppercase leading-[16.1px] tracking-[1px] text-[#06051E]">{fact.label}</span>
                    <span className="font-sans text-[14px] font-bold tracking-[1.2px] text-[#2269AB]">{fact.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {showCourseCard ? <VenueCourseCard venue={venue} guide={courseGuide} /> : null}
          </div>
        </Container>
      </section>

      <VenueFeaturedArticle venue={venue} championships={championshipsChronological} articles={allArticles} />

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
            <OverviewVideo url={venue.overviewVideoUrl} poster={venue.imageUrl} className="bg-black" />
            {venue.overview.length > 0 ? (
              <div className="flex flex-col justify-center gap-4 px-6 py-10 sm:px-12 lg:px-16">
                <p className="font-sans text-[20px] font-normal leading-[28.57px] text-white">{venue.overview[0]}</p>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {championshipsChronological.length === 0 ? (
        <Container className="py-10 sm:py-14">
          <p className="text-sm text-muted-foreground">{venue.name} has not yet hosted a recorded championship in our archive.</p>
        </Container>
      ) : null}

      <VenueGalleryAll venue={venue} championships={championshipsChronological} />

      {/* Both of these carry their own full-bleed band now, so they sit outside the Container --
          the same reason the film band above does. */}
      {championshipsChronological.length > 0 ? (
        <VenueChampionshipCarousel
          venueName={venue.name}
          entries={championshipsChronological.map((c) => ({
            year: c.year,
            winnerName: c.winnerName,
            caption: c.venueStripCaption,
            hasVideo: Boolean(c.overviewVideoFileUrl || c.overviewVideoUrl),
            // Three deep, and only this section has the first rung: the strip's own photo, then
            // the Champion Photo that the Champion Golfers band below uses, then the player's
            // profile portrait. So the two sections show the same picture until someone gives the
            // strip one of its own, which is the point -- a moment from the day belongs here, a
            // portrait belongs under Champion Golfers, but nothing goes blank in the meantime.
            //
            // The strip photo sits outside the winnerName check deliberately. A championship with
            // no champion recorded yet can still have a photograph of the course.
            photoUrl:
              c.venueStripPhotoUrl ?? (c.winnerName ? c.winnerPhotoUrl ?? portraitUrl(playerByName.get(c.winnerName)?.photoUrl) : undefined),
          }))}
        />
      ) : null}

      <VenueChampions venueName={venue.name} champions={champions} logoUrl={(await getSiteTheme()).logoUrl} />
    </>
  );
}
