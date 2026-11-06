"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { AlignJustify, ChevronLeft, ChevronRight, Play } from "lucide-react";

import { Container } from "@/components/shared/container";
import { PlaceholderArt } from "@/components/shared/placeholder-art";

export interface VenueChampionshipSlide {
  year: number;
  /** Only for the photograph's alt text -- the visible caption is `caption` and nothing else. */
  winnerName?: string;
  /**
   * The editorial line written across the photograph, from the Championship's own "Caption (venue
   * page strip)" field. Blank is a real answer, not a gap to fill: the card then carries its year
   * and photograph alone, the way theopen.com's uncaptioned frames do. Nothing is generated from
   * the winner's name to stand in for it.
   */
  caption?: string;
  photoUrl?: string;
  /**
   * Whether this championship has an overview film, which only changes the icon in the corner
   * badge -- a play triangle rather than the lines of text. theopen.com does the same: their 1951
   * Faulkner card carries a play symbol and the 2019 and 2025 cards carry text marks, and in both
   * cases the badge goes to that championship's own page rather than straight to the film.
   */
  hasVideo?: boolean;
}

/** `/previous-opens/{year}` -- the championship's own page, which is what the badge opens. */
function championshipHref(year: number): string {
  return `/previous-opens/${year}`;
}

// Their card is 224 wide by 375 tall: a 26px year on its own line, then a 340-tall picture. The
// widths vary down their strip (224, 400, 226, 400...) because each picture keeps its own aspect
// at a fixed 340 height. Ours are all player portraits, so one portrait width is right rather
// than a ratio that changes per photo.
const CARD_WIDTH = 224;
const IMAGE_HEIGHT = 340;

export function VenueChampionshipCarousel({ venueName, entries }: { venueName: string; entries: VenueChampionshipSlide[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: "start", containScroll: "trimSnaps" });
  const [canScroll, setCanScroll] = useState({ prev: false, next: false });

  const onSelect = useCallback(() => {
    if (emblaApi) setCanScroll({ prev: emblaApi.canScrollPrev(), next: emblaApi.canScrollNext() });
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    // Embla's documented initialisation: subscribe, then read once, because the carousel's own
    // "init" event has already fired by the time this effect runs and will not replay. The rule
    // below is right in general -- this is one extra render on mount, and without it both arrows
    // render enabled on a strip that may not scroll at all.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see above
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  if (entries.length === 0) return null;

  return (
    // Full-bleed #06051E, which is the one real structural difference here -- ours was sitting on
    // the page's own grey with no band at all. Their 120px of bottom padding and the 75/65 either
    // side of the heading are what give the strip its air.
    <section className="relative w-full overflow-hidden bg-[#06051E]">
      {/*
       * The navy is flat on its own, and against black-and-white archive photographs that reads as
       * an absence rather than a colour. Theirs carries a faint sheen across the top-left corner.
       *
       * Two layers, both CSS rather than an uploaded image -- it costs no bytes, scales to any
       * width without tiling seams, and there is no asset for anyone to lose:
       *
       *   1. a broad diagonal wash, brightest at the top-left and gone by just past halfway, which
       *      is what stops the band reading as a flat rectangle;
       *   2. hairlines at 1px every 7px, at roughly 1.5% white, which is below the threshold you
       *      would call a stripe and about at the one where the surface stops looking printed.
       *
       * Both angled at 115deg so they agree with each other. Keep the alphas low: at a third of
       * this strength it is a pattern on a navy background, which is a different and worse thing.
       */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: [
            "linear-gradient(115deg, rgba(104,122,205,0.17) 0%, rgba(58,70,142,0.07) 26%, rgba(6,5,30,0) 54%)",
            "repeating-linear-gradient(115deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, rgba(255,255,255,0) 1px, rgba(255,255,255,0) 7px)",
          ].join(", "),
        }}
      />

      <Container className="relative pb-[120px]">
        {/* Heading and arrows share this row, which is where theirs puts them -- the arrows sit
            top-right, level with the title, rather than floating over the middle of the
            photographs where they covered whatever was behind them. */}
        <div className="flex items-center justify-between gap-6 pb-[65px] pt-[75px]">
          <h2 className="font-menu text-[26px] font-bold uppercase leading-[31.98px] tracking-[1.6px] text-white">The Legs Open at {venueName}</h2>

          {/* A strip, not a slideshow: the arrows only mean anything once the cards overflow,
              and most courses here have hosted once. */}
          {canScroll.prev || canScroll.next ? (
            <div className="flex shrink-0 gap-3">
              <button
                type="button"
                aria-label="Previous championships"
                onClick={() => emblaApi?.scrollPrev()}
                disabled={!canScroll.prev}
                className="flex h-[52px] w-[52px] items-center justify-center rounded-full border border-white/40 text-white transition-colors hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Next championships"
                onClick={() => emblaApi?.scrollNext()}
                disabled={!canScroll.next}
                className="flex h-[52px] w-[52px] items-center justify-center rounded-full border border-white/40 text-white transition-colors hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          ) : null}
        </div>

        <div className="relative">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex gap-5">
              {entries.map((entry) => (
                // The year sits above the picture in 26px Cardinal rather than overlaid in the
                // corner at 14px, which is the change you asked for -- it reads as a date line
                // over each card instead of a caption inside it.
                <div key={entry.year} className="flex flex-none flex-col gap-[5px]" style={{ width: CARD_WIDTH }}>
                  <p className="font-menu text-[26px] font-normal leading-[29.9px] tracking-[1.6px] text-white">{entry.year}</p>
                  <div className="relative w-full overflow-hidden bg-primary" style={{ height: IMAGE_HEIGHT }}>
                    <PlaceholderArt
                      label={entry.winnerName ? `${entry.winnerName} portrait` : `${entry.year} champion not yet recorded`}
                      imageUrl={entry.photoUrl}
                      tone="navy"
                      blendBlack
                      fill
                      sizes="224px"
                    />

                    {/*
                     * Their corner badge, flush into the top-left of the photograph, opening that
                     * championship's own page. Theirs is a solid square of their brand blue on
                     * navy; ours is the same move in our palette -- accent gold with the navy
                     * drawn on it -- rather than borrowing a blue that belongs to somebody else's
                     * identity.
                     *
                     * 40px square. Theirs is ~46 on a ~390-wide card; scaled strictly to our 224
                     * that would be 26, which is both fiddly to hit and too small to read as a
                     * deliberate mark, so it is held at 40 instead and allowed to take a slightly
                     * larger share of a narrower card.
                     */}
                    <Link
                      href={championshipHref(entry.year)}
                      aria-label={`The ${entry.year} Legs Open at ${venueName}`}
                      className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center bg-accent text-accent-foreground transition-opacity hover:opacity-85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    >
                      {entry.hasVideo ? (
                        <Play className="h-[18px] w-[18px] fill-current" aria-hidden="true" />
                      ) : (
                        <AlignJustify className="h-[18px] w-[18px]" aria-hidden="true" />
                      )}
                    </Link>
                    {/* Theirs sets the caption straight onto the photograph. A gradient stays
                        here because our portraits are not all dark at the foot and white 16px
                        on a bright sky is unreadable -- and it is rendered with the caption
                        rather than always, so an uncaptioned card is a clean photograph instead
                        of a dark smudge along its bottom edge with nothing written on it. */}
                    {entry.caption ? (
                      <>
                        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/85 to-transparent" />
                        <p className="absolute inset-x-0 bottom-0 p-4 font-sans text-[16px] font-normal leading-[24px] tracking-[0.5px] text-white">
                          {entry.caption}
                        </p>
                      </>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </Container>
    </section>
  );
}
