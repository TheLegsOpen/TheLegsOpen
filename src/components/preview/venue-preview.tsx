import Link from "next/link";
import { getPayload } from "payload";
import { ArrowRight, MapPin } from "lucide-react";

import configPromise from "@/payload.config";
import { Container } from "@/components/shared/container";
import { CountryFlag } from "@/components/shared/country-flag";
import { ArticleCard } from "@/components/news/article-card";
import { PlayerGallery } from "@/components/players/player-gallery";
import { getArticlesForChampionship } from "@/lib/data/articles";
import { getToughestHoles } from "@/lib/data/scoring-statistics";
import { isStillToCome } from "@/lib/data/championship-timing";
import { cn } from "@/lib/utils";
import type { Venue } from "@/types/venue";
import type { ChampionshipWinner } from "@/types/championship";
import type { Article } from "@/types/article";

const SECTION_TITLE = "font-menu text-[14px] font-bold uppercase leading-[16px] tracking-[1.6px] text-[#43524E]";

function upcomingHere(championships: ChampionshipWinner[]): ChampionshipWinner | undefined {
  return championships.find((c) => !c.completed && isStillToCome({ year: c.year, date: c.date }));
}

/** PREVIEW (13): the line under the venue name -- years hosted or the date to come, location, and a button. */
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
        <Link href="/field" className="inline-flex items-center gap-2 bg-accent px-4 py-2 font-sans text-[17px] font-light uppercase text-[#06051e] hover:bg-white">
          View the {next.year} field <ArrowRight className="h-4 w-4" />
        </Link>
      ) : last ? (
        <Link href={`/previous-opens/${last}`} className="inline-flex items-center gap-2 bg-accent px-4 py-2 font-sans text-[17px] font-light uppercase text-[#06051e] hover:bg-white">
          View the {last} Legs Open <ArrowRight className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}

interface HoleCard {
  holeNumber: number;
  par: number;
  si?: number;
  yards?: number;
  average?: number;
}

/** PREVIEW (14, 15, 25, 29): the sections the venue page would gain. */
export async function VenuePreviewSections({ venue, championships }: { venue: Venue; championships: ChampionshipWinner[] }) {
  const payload = await getPayload({ config: configPromise });
  const raw = await payload.find({ collection: "venues", where: { slug: { equals: venue.slug } }, limit: 1, depth: 0 });
  const holesRaw = (raw.docs[0]?.holes ?? []) as { holeNumber?: number; par: number; yards?: number | null; si?: number | null }[];

  // 25: the field's average gross score per hole, pooled over every Legs Open played here.
  const played = championships.filter((c) => c.completed);
  const perChampionship = await Promise.all(played.map((c) => getToughestHoles("scratch", c.id).catch(() => [])));
  const holes: HoleCard[] = holesRaw.map((h, i) => {
    const averages = perChampionship.map((rows) => rows.find((r) => r.holeNumber === i + 1)?.average).filter((a): a is number => a !== undefined);
    return {
      holeNumber: i + 1,
      par: h.par,
      si: h.si ?? undefined,
      yards: h.yards ?? undefined,
      average: averages.length ? averages.reduce((a, b) => a + b, 0) / averages.length : undefined,
    };
  });
  const scored = holes.filter((h) => h.average !== undefined);
  const hardest = scored.length ? scored.reduce((a, b) => (b.average! - b.par > a.average! - a.par ? b : a)).holeNumber : undefined;
  const easiest = scored.length ? scored.reduce((a, b) => (b.average! - b.par < a.average! - a.par ? b : a)).holeNumber : undefined;
  const totalPar = holes.reduce((s, h) => s + h.par, 0);
  const totalYards = holes.reduce((s, h) => s + (h.yards ?? 0), 0);

  // 15: articles tagged to any championship played here.
  const tagged = (await Promise.all(championships.map((c) => getArticlesForChampionship(c.id, 6).catch(() => [] as Article[])))).flat();
  const articles = [...new Map(tagged.map((a) => [a.slug, a])).values()].slice(0, 3);

  // 29: the venue's own photos and every championship's photos from here.
  const photos = [...(venue.gallery ?? []), ...championships.flatMap((c) => (c.gallery ?? []).map((p) => ({ ...p, caption: p.caption ?? `${c.year} Legs Open` })))];

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([venue.name, venue.location, venue.country].filter(Boolean).join(", "))}`;

  return (
    <>
      {/* 14 */}
      <section className="bg-white">
        <Container className="grid grid-cols-1 gap-5 py-12 md:grid-cols-2">
          <div className="flex flex-col justify-between gap-6 bg-primary p-8 text-white">
            <div className="flex flex-col gap-3">
              <h2 className="font-menu text-[36px] font-bold uppercase leading-none">The Course</h2>
              <p className="text-sm text-white/80">
                {venue.parYardage ?? (holes.length ? `Par ${totalPar}${totalYards ? ` · ${totalYards.toLocaleString("en-GB")} yards` : ""}` : "")}
                {hardest ? ` · Hardest hole in Legs Open play: the ${hardest}${["st", "nd", "rd"][((hardest + 90) % 100 - 10) % 10 - 1] ?? "th"}` : ""}
              </p>
            </div>
            <a href="#course-guide" className="inline-flex w-fit items-center gap-2 bg-accent px-4 py-2 font-sans text-[17px] font-light uppercase text-[#06051e] hover:bg-white">
              Hole by hole <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <div className="flex flex-col justify-between gap-6 bg-primary p-8 text-white">
            <div className="flex flex-col gap-3">
              <h2 className="font-menu text-[36px] font-bold uppercase leading-none">Getting There</h2>
              <p className="flex items-start gap-2 text-sm text-white/80">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {[venue.name, venue.location, venue.region, venue.country].filter(Boolean).join(", ")}
              </p>
              <p className="text-xs text-white/50">If approved: an optional clubhouse and travel note you write in the admin appears here.</p>
            </div>
            <a href={mapsUrl} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-2 bg-accent px-4 py-2 font-sans text-[17px] font-light uppercase text-[#06051e] hover:bg-white">
              Open in Maps <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </Container>
      </section>

      {/* 25 */}
      {holes.length > 0 ? (
        <section id="course-guide" className="bg-[#F7F7F7]">
          <Container className="flex flex-col gap-6 py-12">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className={SECTION_TITLE}>Course guide · hole by hole</h2>
              <p className="text-xs text-[#43524E]">
                {scored.length
                  ? `Field average (gross) over ${played.length} Legs Open${played.length === 1 ? "" : "s"} here. Red: hardest. Green: easiest.`
                  : "Not yet played in the Legs Open: par, stroke index and yardage only."}
              </p>
            </div>
            <ol className="grid grid-cols-3 gap-px bg-[#B9BEC0] sm:grid-cols-6 lg:grid-cols-9">
              {holes.map((h) => (
                <li
                  key={h.holeNumber}
                  className={cn(
                    "flex flex-col gap-1 bg-white p-3",
                    h.holeNumber === hardest && "bg-[#CB333B] text-white",
                    h.holeNumber === easiest && "bg-[#0E3D2C] text-white",
                  )}
                >
                  <span className="font-menu text-[22px] font-bold leading-none">{h.holeNumber}</span>
                  <span className="text-[11px] uppercase tracking-wide opacity-70">
                    Par {h.par}
                    {h.si ? ` · SI ${h.si}` : ""}
                  </span>
                  {h.yards ? <span className="text-[11px] opacity-70">{h.yards} yds</span> : null}
                  {h.average !== undefined ? (
                    <span className="mt-1 font-sans text-[15px] font-bold tabular-nums">
                      {h.average.toFixed(2)}
                      <span className="ml-1 text-[11px] font-normal opacity-70">
                        ({h.average - h.par >= 0 ? "+" : ""}
                        {(h.average - h.par).toFixed(2)})
                      </span>
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
          </Container>
        </section>
      ) : null}

      {/* 15 */}
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

      {/* 29 */}
      {photos.length > 0 ? <PlayerGallery title={`${venue.name} at The Legs Open`} playerName={venue.name} photos={photos} /> : null}
    </>
  );
}
