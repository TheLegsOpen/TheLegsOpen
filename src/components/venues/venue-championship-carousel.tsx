"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Container } from "@/components/shared/container";
import { PlaceholderArt } from "@/components/shared/placeholder-art";

export interface VenueChampionshipSlide {
  year: number;
  winnerName?: string;
  winnerPlayerSlug?: string;
  margin?: string;
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
    <section className="w-full bg-[#06051E]">
      <Container className="pb-[120px]">
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
                        on a bright sky is unreadable. */}
                    <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/85 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-4 font-sans text-[16px] font-normal leading-[24px] tracking-[0.5px] text-white">
                      {entry.winnerName ? (
                        entry.winnerPlayerSlug ? (
                          <Link href={`/players/${entry.winnerPlayerSlug}`} className="hover:underline">
                            {entry.winnerName}
                          </Link>
                        ) : (
                          <span>{entry.winnerName}</span>
                        )
                      ) : (
                        <span className="text-white/70">Champion not yet recorded</span>
                      )}
                      {entry.margin ? <span className="text-white/70"> · {entry.margin}</span> : null}
                    </div>
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
