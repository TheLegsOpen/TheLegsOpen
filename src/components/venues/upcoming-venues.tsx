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

/**
 * What each card actually measures, so next/image is not asked for a viewport-width photo to fill
 * a 262px column. Derived from COLUMN_TEMPLATE against the 1366 content width less the 20px
 * gutters: one card takes the lot, two split 808/538, three take 744/262/262. Below `sm` the grid
 * is still side by side, so the vw figures keep the same proportions rather than dropping to 100vw.
 */
const CARD_SIZES: Record<number, string[]> = {
  1: ["(min-width: 1430px) 1366px, 100vw"],
  2: ["(min-width: 1430px) 808px, 59vw", "(min-width: 1430px) 538px, 39vw"],
  3: ["(min-width: 1430px) 744px, 54vw", "(min-width: 1430px) 262px, 19vw", "(min-width: 1430px) 262px, 19vw"],
};

export function UpcomingVenues({ championships }: { championships: UpcomingChampionship[] }) {
  if (championships.length === 0) return null;
  const shown = championships.slice(0, 3);

  return (
    <div className="grid h-[420px] gap-5 sm:h-[531px]" style={{ gridTemplateColumns: COLUMN_TEMPLATE[shown.length] }}>
      {shown.map((championship, index) => (
        <UpcomingVenueCard
          key={championship.venueSlug}
          championship={championship}
          emphasis={index === 0}
          sizes={CARD_SIZES[shown.length]?.[index] ?? "100vw"}
        />
      ))}
    </div>
  );
}
