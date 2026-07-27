import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { CountryFlag } from "@/components/shared/country-flag";
import type { Venue } from "@/types/venue";

export function VenueListItem({ venue }: { venue: Venue }) {
  const locationLine = [venue.location, venue.region, venue.country].filter(Boolean).join(", ");

  return (
    <Link
      href={`/venues/${venue.slug}`}
      className="group flex items-center justify-between gap-4 py-5 transition-colors hover:bg-secondary"
    >
      <div>
        <h3 className="font-display font-bold text-lg group-hover:text-primary">{venue.name}</h3>
        <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          {venue.countryCode ? <CountryFlag code={venue.countryCode} className="h-3 w-[18px] shrink-0" /> : null}
          <span>{locationLine}</span>
        </p>
      </div>
      <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-primary">
        More Info
        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </Link>
  );
}
