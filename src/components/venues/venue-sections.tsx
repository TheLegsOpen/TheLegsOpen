import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Container } from "@/components/shared/container";
import { CountryFlag } from "@/components/shared/country-flag";
import { PlaceholderArt } from "@/components/shared/placeholder-art";
import { PlayerGallery } from "@/components/players/player-gallery";
import { getArticlesForChampionship } from "@/lib/data/articles";
import type { CourseGuide } from "@/lib/data/course-guide";
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
 * The line under the venue name -- years hosted or the date to come, location, and a
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
 * The Course, under Upcoming Venues in the band beneath the hero, linking to the venue's course
 * page with the hole-by-hole guide. The venue page only renders it once the course has at least
 * one hole image.
 */
export function VenueCourseCard({ venue, guide }: { venue: Venue; guide: CourseGuide }) {
  const { hardest, totalPar, totalYards } = guide;
  const yardage = totalYards ? ` · ${totalYards.toLocaleString("en-GB")} yards` : "";
  return (
    <div className="flex flex-col gap-5 bg-primary p-6 text-white">
      <div className="flex flex-col gap-2">
        <h2 className="font-menu text-[28px] font-bold uppercase leading-none">The Course</h2>
        <p className="text-sm text-white/80">{venue.parYardage ?? `Par ${totalPar}${yardage}`}</p>
        {hardest ? <p className="text-sm text-white/80">Hardest hole in Legs Open play: the {ordinal(hardest)}</p> : null}
      </div>
      <Link href={`/venues/${venue.slug}/course`} className={BUTTON}>
        Hole by hole <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

/**
 * One selected article straight after the intro band, as theopen.com's venue pages carry
 * -- the photo on one side, the championship, TITLE / dek and Read More on the other. The first of
 * the venue's own Featured Articles if any are picked in the admin; otherwise the latest piece
 * tagged to the most recent championship here.
 */
export async function VenueFeaturedArticle({ venue, championships, articles }: { venue: Venue; championships: ChampionshipWinner[]; articles: Article[] }) {
  let article = (venue.featuredArticleSlugs ?? []).map((slug) => articles.find((a) => a.slug === slug)).find((a): a is Article => Boolean(a));
  if (!article) {
    const latest = [...championships].filter((c) => c.completed).sort((a, b) => b.year - a.year)[0];
    if (latest) article = (await getArticlesForChampionship(latest.id, 1).catch(() => [] as Article[]))[0];
  }
  if (!article) return null;

  return (
    <section className="bg-white">
      <Container className="py-12">
        <Link href={`/latest/${article.slug}`} className="group grid grid-cols-1 bg-[#F7F7F7] md:grid-cols-2">
          <span className="relative block aspect-[16/10] overflow-hidden">
            <PlaceholderArt label={article.heroLabel} imageUrl={article.imageUrl} tone="navy" fill sizes="(min-width: 1430px) 613px, (min-width: 768px) 50vw, 100vw" className="transition-transform duration-300 ease-standard group-hover:scale-[1.03]" />
          </span>
          <span className="flex flex-col justify-center gap-5 p-8 lg:p-12">
            <span className="font-menu text-[12px] uppercase tracking-[2.4px] text-[#43524E]">{article.category}</span>
            <span className="font-menu text-[28px] leading-[1.2] text-[#2a2a2a] lg:text-[32px]">
              <span className="font-bold uppercase tracking-[1px]">{article.title}</span>
              {article.dek ? (
                <>
                  <span className="mx-2 text-accent">/</span>
                  <span className="font-normal">{article.dek}</span>
                </>
              ) : null}
            </span>
            <span className={cn(BUTTON, "group-hover:bg-primary group-hover:text-white")}>
              Read more <ArrowRight className="h-4 w-4" />
            </span>
          </span>
        </Link>
      </Container>
    </section>
  );
}

/** Every photo from here -- the venue's own and each championship's. */
export function VenueGalleryAll({ venue, championships }: { venue: Venue; championships: ChampionshipWinner[] }) {
  const photos = [
    ...(venue.gallery ?? []),
    ...championships.flatMap((c) => (c.gallery ?? []).map((p) => ({ ...p, caption: p.caption ?? `${c.year} Legs Open` }))),
  ];
  return photos.length > 0 ? <PlayerGallery title={`${venue.name} at The Legs Open`} playerName={venue.name} photos={photos} /> : null;
}
