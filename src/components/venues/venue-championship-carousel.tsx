"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { PlaceholderArt } from "@/components/shared/placeholder-art";

export interface VenueChampionshipSlide {
  year: number;
  winnerName?: string;
  winnerPlayerSlug?: string;
  margin?: string;
  photoUrl?: string;
}

export function VenueChampionshipCarousel({ venueName, entries }: { venueName: string; entries: VenueChampionshipSlide[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: entries.length > 1 });
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

  if (entries.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-display font-bold text-2xl">The Legs Open at {venueName}</h2>
      <div className="relative">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {entries.map((entry, index) => (
              <div key={index} className="min-w-0 flex-[0_0_100%]">
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-primary">
                  <PlaceholderArt
                    label={entry.winnerName ? `${entry.winnerName} portrait` : `${entry.year} champion not yet recorded`}
                    imageUrl={entry.photoUrl}
                    tone="navy"
                    blendBlack
                    fill
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-6 text-white">
                    <span className="font-display text-4xl font-bold">{entry.year}</span>
                    {entry.winnerName ? (
                      entry.winnerPlayerSlug ? (
                        <Link
                          href={`/players/${entry.winnerPlayerSlug}`}
                          className="w-fit font-display text-xl font-bold uppercase tracking-wide hover:text-accent hover:underline"
                        >
                          {entry.winnerName}
                        </Link>
                      ) : (
                        <span className="font-display text-xl font-bold uppercase tracking-wide">{entry.winnerName}</span>
                      )
                    ) : (
                      <span className="text-white/70">TBD</span>
                    )}
                    {entry.margin ? <span className="text-sm text-white/70">{entry.margin}</span> : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {entries.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="Previous championship"
              onClick={() => emblaApi?.scrollPrev()}
              className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center bg-primary/80 text-primary-foreground transition-colors hover:bg-primary"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Next championship"
              onClick={() => emblaApi?.scrollNext()}
              className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center bg-primary/80 text-primary-foreground transition-colors hover:bg-primary"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <span className="absolute bottom-3 right-3 bg-primary/80 px-2 py-1 text-xs font-bold tabular-nums text-primary-foreground">
              {String(selectedIndex + 1).padStart(2, "0")} / {String(entries.length).padStart(2, "0")}
            </span>
          </>
        ) : null}
      </div>
    </div>
  );
}
