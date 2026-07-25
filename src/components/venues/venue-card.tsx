import Link from "next/link";

import { PlaceholderArt } from "@/components/shared/placeholder-art";
import type { Venue } from "@/types/venue";

export function VenueCard({ venue }: { venue: Venue }) {
  return (
    <Link href={`/venues/${venue.slug}`} className="group flex flex-col gap-4">
      <PlaceholderArt
        label={venue.imageLabel}
        imageUrl={venue.imageUrl}
        tone="dusk"
        ratio="4/3"
        className="transition-transform duration-300 ease-standard group-hover:scale-[1.02]"
      />
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
