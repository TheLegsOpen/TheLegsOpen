"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
        <div className="pb-[65px] pt-[75px]">
          <h2 className="font-menu text-[26px] font-bold uppercase leading-[31.98px] tracking-[1.6px] text-white">The Legs Open at {venueName}</h2>
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

          {/* A strip, not a slideshow: the arrows only mean anything once the cards overflow,
              and most courses here have hosted once. */}
          {canScroll.prev || canScroll.next ? (
            <>
              <button
                type="button"
                aria-label="Previous championships"
                onClick={() => emblaApi?.scrollPrev()}
                disabled={!canScroll.prev}
                className="absolute left-0 top-1/2 flex h-[55px] w-[45px] -translate-y-1/2 items-center justify-center bg-white/15 text-white transition-colors hover:bg-white/30 disabled:opacity-30"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Next championships"
                onClick={() => emblaApi?.scrollNext()}
                disabled={!canScroll.next}
                className="absolute right-0 top-1/2 flex h-[55px] w-[45px] -translate-y-1/2 items-center justify-center bg-white/15 text-white transition-colors hover:bg-white/30 disabled:opacity-30"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          ) : null}
        </div>
      </Container>
    </section>
  );
}
