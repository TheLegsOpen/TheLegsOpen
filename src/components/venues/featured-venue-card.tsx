import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { PlaceholderArt } from "@/components/shared/placeholder-art";
import { CountryFlag } from "@/components/shared/country-flag";
import type { Venue } from "@/types/venue";

export function FeaturedVenueCard({ venue }: { venue: Venue }) {
  const locationLine = [venue.location, venue.region, venue.country].filter(Boolean).join(", ");

  return (
    <Link
      href={`/venues/${venue.slug}`}
      className="group grid gap-0 overflow-hidden rounded-lg border border-border sm:grid-cols-2"
    >
      <div className="relative">
        <PlaceholderArt
          label={venue.imageLabel}
          imageUrl={venue.imageUrl}
          tone="dusk"
          ratio="4/3"
          fill
          className="transition-transform duration-300 ease-standard group-hover:scale-[1.02]"
        />
        {venue.countryCode ? (
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded bg-black/60 px-2 py-1 text-white">
            <CountryFlag code={venue.countryCode} className="h-3 w-[18px]" />
          </span>
        ) : null}
      </div>
      <div className="flex flex-col justify-center gap-3 bg-secondary p-6 sm:p-10">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Home Venue</span>
        <h2 className="font-display font-bold text-display-md group-hover:text-primary">{venue.name}</h2>
        <p className="text-sm text-muted-foreground">{locationLine}</p>
        <p className="text-muted-foreground">{venue.parYardage}</p>
        <p className="text-sm text-muted-foreground">
          Hosted {venue.timesHosted} times · last {venue.lastHosted}
        </p>
        <span className="mt-2 flex w-fit items-center gap-1 text-sm font-semibold text-primary">
          More Info
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
