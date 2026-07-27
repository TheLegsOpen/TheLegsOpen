import { UpcomingVenueCard } from "@/components/venues/upcoming-venue-card";
import type { UpcomingChampionship } from "@/lib/data/championships";

/**
 * fr-based column widths so 2 or 3 upcoming venues split the row as
 * 4:1 or 3:1:1 — the first (soonest) championship is always the emphasis card.
 */
const COLUMN_TEMPLATE: Record<number, string> = {
  1: "1fr",
  2: "4fr 1fr",
  3: "3fr 1fr 1fr",
};

export function UpcomingVenues({ championships }: { championships: UpcomingChampionship[] }) {
  if (championships.length === 0) return null;
  const shown = championships.slice(0, 3);

  return (
    <div className="grid h-[420px] gap-3 sm:h-[480px]" style={{ gridTemplateColumns: COLUMN_TEMPLATE[shown.length] }}>
      {shown.map((championship, index) => (
        <UpcomingVenueCard key={championship.venueSlug} championship={championship} emphasis={index === 0} />
      ))}
    </div>
  );
}
