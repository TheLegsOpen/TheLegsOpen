import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { CountryFlag } from "@/components/shared/country-flag";
import type { Venue } from "@/types/venue";

export function VenueListItem({ venue }: { venue: Venue }) {
  const locationLine = [venue.location, venue.region, venue.country].filter(Boolean).join(", ");

  return (
    // The Open's venue row, to its own measurements: the course name at 32px in Cardinal Photo
    // with 1.6px of tracking, the location under it at 16px in the same face, and MORE INFO in
    // their link blue. Ours had the name at 18px bold and the location in the sans -- a row of
    // list items rather than a page of courses. Their padding is 35px vertical and 40px
    // horizontal, which is what gives the row its height.
    <Link
      href={`/venues/${venue.slug}`}
      className="group flex items-center justify-between gap-4 px-0 py-[35px] transition-colors hover:bg-secondary sm:px-10"
    >
      <div className="flex flex-col gap-1">
        <h3 className="font-menu text-[32px] font-normal leading-[36.8px] tracking-[1.6px] text-foreground group-hover:text-primary">
          {venue.name}
        </h3>
        <p className="flex items-center gap-2 font-menu text-[16px] leading-[18.4px] tracking-[0.1px] text-[#43524E]">
          {venue.countryCode ? <CountryFlag code={venue.countryCode} className="h-3 w-[18px] shrink-0" /> : null}
          <span>{locationLine}</span>
        </p>
      </div>
      <span className="flex shrink-0 items-center gap-1 font-sans text-[14px] font-bold uppercase leading-[16.1px] tracking-[1.2px] text-[#2269AB]">
        More Info
        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </Link>
  );
}
