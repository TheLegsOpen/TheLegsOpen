import Link from "next/link";

import { PlaceholderArt } from "@/components/shared/placeholder-art";
import { CountryFlag } from "@/components/shared/country-flag";
import { cn, formatDate } from "@/lib/utils";
import type { UpcomingChampionship } from "@/lib/data/championships";

export function UpcomingVenueCard({
  championship,
  emphasis = false,
}: {
  championship: UpcomingChampionship;
  emphasis?: boolean;
}) {
  const dateLabel = championship.date ? formatDate(championship.date) : String(championship.year);

  return (
    <Link
      href={`/venues/${championship.venueSlug}`}
      className="group relative block h-full overflow-hidden rounded-lg"
    >
      <PlaceholderArt
        label={championship.venueImageLabel}
        imageUrl={championship.venueImageUrl}
        tone="dusk"
        fill
        className="transition-transform duration-300 ease-standard group-hover:scale-[1.03]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-4 sm:p-6">
        {championship.venueCountryCode ? (
          <CountryFlag code={championship.venueCountryCode} className="h-3 w-[18px]" />
        ) : null}
        <p className={cn("font-medium uppercase tracking-wide text-white/80", emphasis ? "text-sm" : "text-xs")}>
          {dateLabel}
        </p>
        <h3
          className={cn(
            "font-display font-bold text-balance text-white",
            emphasis ? "text-2xl sm:text-3xl" : "text-base sm:text-lg",
          )}
        >
          {championship.venueName}
        </h3>
      </div>
    </Link>
  );
}
