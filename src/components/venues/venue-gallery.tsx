"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { PlaceholderArt } from "@/components/shared/placeholder-art";
import { cn } from "@/lib/utils";
import type { VenueGalleryPhoto } from "@/types/venue";

export function VenueGallery({ venueName, photos }: { venueName: string; photos: VenueGalleryPhoto[] }) {
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

  return (
    <div className="flex flex-col gap-4">
      {/* The Open's gallery runs with no heading at all. Ours keeps one, because by this point the
          page has several sections and an unlabelled carousel is hard to place -- but it drops to
          the quiet 14/700 label the rest of the page now uses rather than a 24px display heading
          competing with the pictures. */}
      <h2 className="font-menu text-[14px] font-bold uppercase leading-[16.1px] tracking-[1.2px] text-foreground">Pictures at {venueName}</h2>
      <div className="relative">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {photos.map((photo, index) => (
              <div key={index} className="min-w-0 flex-[0_0_100%]">
                <PlaceholderArt label={photo.caption ?? `${venueName} photo ${index + 1}`} imageUrl={photo.imageUrl} tone="dusk" ratio="16/9" />
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
              className="absolute left-0 top-1/2 flex h-[55px] w-[45px] -translate-y-1/2 items-center justify-center bg-primary/80 text-primary-foreground transition-colors hover:bg-primary"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Next slide"
              onClick={() => emblaApi?.scrollNext()}
              className="absolute right-0 top-1/2 flex h-[55px] w-[45px] -translate-y-1/2 items-center justify-center bg-primary/80 text-primary-foreground transition-colors hover:bg-primary"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <span className="absolute bottom-3 right-3 bg-primary/80 px-2 py-1 text-xs font-bold tabular-nums text-primary-foreground">
              {String(selectedIndex + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")}
            </span>
          </>
        ) : null}
      </div>
      {/* Their caption sits under the picture in bold 14 at a 20px line, black rather than grey,
          and stops well short of the right edge -- 145px of padding there, so a long caption wraps
          rather than running the full width of a 1226 image. Ours was grey and regular at the same
          size, which read as a footnote instead of a label. */}
      {photos[selectedIndex]?.caption ? (
        <p className={cn("font-sans text-[14px] font-bold leading-[20px] text-foreground lg:pr-[145px]")}>
          {photos[selectedIndex].caption}
        </p>
      ) : null}
    </div>
  );
}
