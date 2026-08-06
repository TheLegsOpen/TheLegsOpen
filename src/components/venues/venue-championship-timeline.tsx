"use client";

import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { PlaceholderArt } from "@/components/shared/placeholder-art";

export interface VenueChampionshipTimelineEntry {
  year: number;
  winnerName?: string;
  winnerPlayerSlug?: string;
  photoUrl?: string;
}

export function VenueChampionshipTimeline({
  venueName,
  entries,
}: {
  venueName: string;
  entries: VenueChampionshipTimelineEntry[];
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start", containScroll: "trimSnaps" });

  if (entries.length === 0) return null;

  return (
    <div className="flex flex-col gap-6 bg-surface-dark p-6 text-surface-dark-foreground sm:p-8">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-2xl font-bold text-white">Championship Years at {venueName}</h2>
        {entries.length > 1 ? (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              aria-label="Scroll earlier years"
              onClick={() => emblaApi?.scrollPrev()}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Scroll later years"
              onClick={() => emblaApi?.scrollNext()}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-4">
          {entries.map((entry, index) => (
            <div key={index} className="flex w-24 flex-none flex-col gap-2 sm:w-32">
              <div className="relative aspect-square w-full overflow-hidden bg-primary">
                <PlaceholderArt
                  label={entry.winnerName ? `${entry.winnerName} portrait` : `${entry.year} champion not yet recorded`}
                  imageUrl={entry.photoUrl}
                  tone="slate"
                  blendBlack
                  fill
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold tabular-nums text-accent">{entry.year}</span>
                {entry.winnerName ? (
                  entry.winnerPlayerSlug ? (
                    <Link
                      href={`/players/${entry.winnerPlayerSlug}`}
                      className="truncate text-xs text-white/80 hover:text-white hover:underline"
                    >
                      {entry.winnerName}
                    </Link>
                  ) : (
                    <span className="truncate text-xs text-white/80">{entry.winnerName}</span>
                  )
                ) : (
                  <span className="text-xs text-white/50">TBD</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
