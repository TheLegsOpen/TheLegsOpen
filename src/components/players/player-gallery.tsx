"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Container } from "@/components/shared/container";
import { PlaceholderArt } from "@/components/shared/placeholder-art";
import type { PlayerGalleryPhoto } from "@/types/player";

/**
 * "<Name> at The Legs Open" -- theopen.com's "Padraig Harrington at The Open" band, measured off
 * /players/padraig-harrington at 1440: a small centred uppercase title, the photo the full width
 * of the content column, square pale-blue arrows on either edge, and under it a caption bar ruled
 * off in #2a2a2a with an "01 / 08" counter in a #43524E block at its right-hand end.
 *
 * It used to sit in the Bio tab's 455px sidebar. Theirs is its own band below the tabs, visible
 * whichever tab is open, and so is this.
 */
export function PlayerGallery({ title, playerName, photos }: { title: string; playerName: string; photos: PlayerGalleryPhoto[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: photos.length > 1 });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (emblaApi) setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  if (photos.length === 0) return null;

  const pad = (n: number) => String(n).padStart(2, "0");
  const caption = photos[selectedIndex]?.caption;

  return (
    <section className="bg-white pb-16 sm:pb-20" aria-roledescription="carousel" aria-label={title}>
      <Container>
        {/* theopen.com's 1226 column (70px inside our 1366 container) from xl -- see COLUMN in
            src/app/(app)/players/[slug]/page.tsx. 55px above the title, 50px from it to the photo. */}
        <div className="xl:px-[70px]">
        <h2 className="pb-[50px] pt-[55px] text-center font-menu text-[14px] font-bold uppercase leading-[16px] tracking-[1.6px] text-[#43524E]">{title}</h2>

        <div className="relative">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex">
              {photos.map((photo, index) => (
                <div
                  key={index}
                  className="min-w-0 flex-[0_0_100%]"
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${index + 1} of ${photos.length}`}
                >
                  <PlaceholderArt
                    sizes="(min-width: 1430px) 1226px, 100vw"
                    label={photo.caption ?? `${playerName} photo ${index + 1}`}
                    imageUrl={photo.imageUrl}
                    tone="navy"
                    // 5:3 -- theirs renders 1226x732 in the 1226 column.
                    ratio="5/3"
                  />
                </div>
              ))}
            </div>
          </div>

          {photos.length > 1 ? (
            <>
              <button
                type="button"
                aria-label="Previous slide"
                onClick={() => emblaApi?.scrollPrev()}
                className="absolute left-0 top-1/2 flex h-[52px] w-[44px] -translate-y-1/2 items-center justify-center bg-[#DCEBF7] text-[#2269AB] transition-colors hover:bg-white"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Next slide"
                onClick={() => emblaApi?.scrollNext()}
                className="absolute right-0 top-1/2 flex h-[52px] w-[44px] -translate-y-1/2 items-center justify-center bg-[#DCEBF7] text-[#2269AB] transition-colors hover:bg-white"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          ) : null}
        </div>

        <div className="flex items-stretch border-b border-[#2a2a2a]">
          <p className="flex-1 py-5 pr-6 font-sans text-[14px] font-bold leading-5 text-black" aria-live="polite">
            {caption ?? " "}
          </p>
          <span className="flex shrink-0 items-center bg-[#43524E] px-[35px] font-sans text-[12px] font-bold tabular-nums leading-5 text-white">
            {pad(selectedIndex + 1)} / {pad(photos.length)}
          </span>
        </div>
        </div>
      </Container>
    </section>
  );
}
