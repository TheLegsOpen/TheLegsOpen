import Link from "next/link";

import { PlaceholderArt } from "@/components/shared/placeholder-art";
import { CountryFlag } from "@/components/shared/country-flag";
import type { Venue } from "@/types/venue";

export function VenueCard({ venue }: { venue: Venue }) {
  return (
    <Link href={`/venues/${venue.slug}`} className="group flex flex-col gap-4">
      <div className="relative">
        <PlaceholderArt
          label={venue.imageLabel}
          imageUrl={venue.imageUrl}
          tone="dusk"
          ratio="4/3"
          className="transition-transform duration-300 ease-standard group-hover:scale-[1.02]"
        />
        {venue.countryCode ? (
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded bg-black/60 px-1.5 py-1 text-white">
            <CountryFlag code={venue.countryCode} className="h-2.5 w-4" />
          </span>
        ) : null}
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{venue.region}</p>
        <h3 className="font-display font-bold text-lg group-hover:text-primary">{venue.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{venue.parYardage}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Hosted {venue.timesHosted} times · last {venue.lastHosted}
        </p>
      </div>
    </Link>
  );
}
