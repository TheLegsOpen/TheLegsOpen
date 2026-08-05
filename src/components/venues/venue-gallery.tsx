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
      <h2 className="font-display font-bold text-2xl">Pictures at {venueName}</h2>
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
              className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center bg-primary/80 text-primary-foreground transition-colors hover:bg-primary"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Next slide"
              onClick={() => emblaApi?.scrollNext()}
              className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center bg-primary/80 text-primary-foreground transition-colors hover:bg-primary"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <span className="absolute bottom-3 right-3 bg-primary/80 px-2 py-1 text-xs font-bold tabular-nums text-primary-foreground">
              {String(selectedIndex + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")}
            </span>
          </>
        ) : null}
      </div>
      {photos[selectedIndex]?.caption ? <p className={cn("text-sm text-muted-foreground")}>{photos[selectedIndex].caption}</p> : null}
    </div>
  );
}
