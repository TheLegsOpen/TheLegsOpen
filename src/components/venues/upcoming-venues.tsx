import { UpcomingVenueCard } from "@/components/venues/upcoming-venue-card";
import type { UpcomingChampionship } from "@/lib/data/championships";

/**
 * fr-based column widths so 2 or 3 upcoming venues split the row — the first (soonest)
 * championship is always the emphasis card.
 *
 * Two cards go 3:2, which is The Open's own split: they run 820 beside 546 across their 1366, and
 * 820/546 is almost exactly three to two. Ours was 4:1, which left the second venue as a sliver
 * next to the first rather than a card in its own right. Three stays 3:1:1 -- they only ever show
 * two, so there is nothing to copy for that case.
 */
const COLUMN_TEMPLATE: Record<number, string> = {
  1: "1fr",
  2: "3fr 2fr",
  3: "3fr 1fr 1fr",
};

export function UpcomingVenues({ championships }: { championships: UpcomingChampionship[] }) {
  if (championships.length === 0) return null;
  const shown = championships.slice(0, 3);

  return (
    <div className="grid h-[420px] gap-5 sm:h-[531px]" style={{ gridTemplateColumns: COLUMN_TEMPLATE[shown.length] }}>
      {shown.map((championship, index) => (
        <UpcomingVenueCard key={championship.venueSlug} championship={championship} emphasis={index === 0} />
      ))}
    </div>
  );
}
