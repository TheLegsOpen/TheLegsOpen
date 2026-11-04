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
      {/* Their gallery does carry a heading -- "Carnoustie in pictures", as h3.section__title --
          which an earlier pass here wrongly recorded as having none. It is the same quiet label
          treatment rather than a display heading: 14/700 Cardinal Photo, uppercase, 1.6px of
          tracking, in #43524E rather than full black so it does not compete with the pictures. */}
      <h2 className="font-menu text-[14px] font-bold uppercase leading-[16.1px] tracking-[1.6px] text-[#43524E]">Pictures at {venueName}</h2>
      <div className="relative">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {photos.map((photo, index) => (
              <div key={index} className="min-w-0 flex-[0_0_100%]">
                {/* 5/3, not 16/9. Measured at 1920 theirs renders 1226x732 -- a ratio of 1.675,
                    which is 5:3 and noticeably taller than the 1.778 of 16:9. */}
                <PlaceholderArt label={photo.caption ?? `${venueName} photo ${index + 1}`} imageUrl={photo.imageUrl} tone="dusk" ratio="5/3" />
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
            {/* Plain white type on the picture, no chip behind it: theirs is Founders 12/700 at
                a 20px line with 20px/35px of padding holding it off the bottom-left corner. The
                navy chip was ours. */}
            <span className="absolute bottom-0 left-0 px-[35px] py-5 font-sans text-[12px] font-bold leading-[20px] tabular-nums text-white">
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
