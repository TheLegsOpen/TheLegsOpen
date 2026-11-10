import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Container } from "@/components/shared/container";
import { CountryFlag } from "@/components/shared/country-flag";
import { ArticleCard } from "@/components/news/article-card";
import { PlayerGallery } from "@/components/players/player-gallery";
import { getArticlesForChampionship } from "@/lib/data/articles";
import { loadCourseGuide } from "@/lib/data/course-guide";
import { isStillToCome } from "@/lib/data/championship-timing";
import { cn, ordinal } from "@/lib/utils";
import type { Venue } from "@/types/venue";
import type { ChampionshipWinner } from "@/types/championship";
import type { Article } from "@/types/article";

const SECTION_TITLE = "font-menu text-[14px] font-bold uppercase leading-[16px] tracking-[1.6px] text-[#43524E]";
const BUTTON = "inline-flex w-fit items-center gap-2 bg-accent px-4 py-2 font-sans text-[17px] font-light uppercase text-[#06051e] hover:bg-white";

function upcomingHere(championships: ChampionshipWinner[]): ChampionshipWinner | undefined {
  return championships.find((c) => !c.completed && isStillToCome({ year: c.year, date: c.date }));
}

/**
 * PREVIEW (13): the line under the venue name -- years hosted or the date to come, location, and a
 * button. A course that has hosted more than once lists every year; the button goes to the most
 * recent one (every year has its own card in the championship strip further down the page).
 */
export function VenueHeroLine({ venue, championships }: { venue: Venue; championships: ChampionshipWinner[] }) {
  const next = upcomingHere(championships);
  const played = championships.filter((c) => c.completed).map((c) => c.year);
  const last = played[played.length - 1];
  const when = next?.date
    ? new Date(next.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" })
    : next
      ? String(next.year)
      : played.length > 0
        ? `Hosted ${played.join(" · ")}`
        : undefined;
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
      {when ? <span className="font-menu text-[24px] leading-none text-white">{when}</span> : null}
      <span className="flex items-center gap-2 text-sm text-white/85">
        {venue.countryCode ? <CountryFlag code={venue.countryCode} className="h-4 w-6" /> : null}
        {[venue.location, venue.country].filter(Boolean).join(", ")}
      </span>
      {next ? (
        <Link href="/field" className={BUTTON}>
          View the {next.year} field <ArrowRight className="h-4 w-4" />
        </Link>
      ) : last ? (
        <Link href={`/previous-opens/${last}`} className={BUTTON}>
          View the {last} Legs Open <ArrowRight className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}

/**
 * PREVIEW: The Course, under Upcoming Venues in the band beneath the hero, linking to the venue's
 * own course page with the hole-by-hole guide. Live, it would only show once the course has hole
 * images uploaded; the preview always shows it so there is something to look at.
 */
export async function VenueCourseCard({ venue, championships }: { venue: Venue; championships: ChampionshipWinner[] }) {
  const guide = await loadCourseGuide(venue.slug, championships);
  if (guide.holes.length === 0) return null;
  const { hardest, totalPar, totalYards } = guide;
  const yardage = totalYards ? ` · ${totalYards.toLocaleString("en-GB")} yards` : "";
  return (
    <div className="flex flex-col gap-5 bg-primary p-6 text-white">
      <div className="flex flex-col gap-2">
        <h2 className="font-menu text-[28px] font-bold uppercase leading-none">The Course</h2>
        <p className="text-sm text-white/80">{venue.parYardage ?? `Par ${totalPar}${yardage}`}</p>
        {hardest ? <p className="text-sm text-white/80">Hardest hole in Legs Open play: the {ordinal(hardest)}</p> : null}
      </div>
      <Link href={`/preview/venues/${venue.slug}/course`} className={BUTTON}>
        Hole by hole <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

/** PREVIEW (15, 29): News & Features from the championships played here, then every photo from here. */
export async function VenueNewsAndGallery({ venue, championships }: { venue: Venue; championships: ChampionshipWinner[] }) {
  const tagged = (await Promise.all(championships.map((c) => getArticlesForChampionship(c.id, 6).catch(() => [] as Article[])))).flat();
  const articles = [...new Map(tagged.map((a) => [a.slug, a])).values()].slice(0, 3);
  const photos = [
    ...(venue.gallery ?? []),
    ...championships.flatMap((c) => (c.gallery ?? []).map((p) => ({ ...p, caption: p.caption ?? `${c.year} Legs Open` }))),
  ];

  return (
    <>
      {articles.length > 0 ? (
        <section className="bg-white">
          <Container className="flex flex-col gap-6 py-12">
            <h2 className={cn(SECTION_TITLE, "text-center")}>News and features from {venue.name}</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              {articles.map((article) => (
                <ArticleCard key={article.slug} article={article} />
              ))}
            </div>
          </Container>
        </section>
      ) : null}
      {photos.length > 0 ? <PlayerGallery title={`${venue.name} at The Legs Open`} playerName={venue.name} photos={photos} /> : null}
    </>
  );
}
