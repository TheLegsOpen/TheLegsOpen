import type { Metadata } from "next";

import { PageHero } from "@/components/shared/page-hero";
import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { UpcomingVenues } from "@/components/venues/upcoming-venues";
import { VenueListItem } from "@/components/venues/venue-list-item";
import { getVenues } from "@/lib/data/venues";
import { getUpcomingChampionships } from "@/lib/data/championships";
import { getPageBanners } from "@/lib/data/page-banners";
import { getSeoSettings } from "@/lib/data/seo-settings";

// See src/app/(app)/page.tsx for why this route is force-dynamic.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoSettings();
  return { title: seo.venues.title, description: seo.venues.description };
}

export default async function VenuesPage() {
  const [venues, upcomingChampionships, banners] = await Promise.all([
    getVenues(),
    getUpcomingChampionships(),
    getPageBanners(),
  ]);

  return (
    <>
      <PageHero
        variant="photo"
        heightPx={292}
        imageLabel="Aerial view of a links course in the rotation"
        imageUrl={banners.venuesUrl}
        eyebrow={banners.venuesEyebrow}
        title={banners.venuesTitle}
        description={banners.venuesDescription}
      />
      <Container className="flex flex-col gap-16 py-16 sm:py-24">
        {upcomingChampionships.length > 0 ? (
          <div>
            <SectionHeading eyebrow="Upcoming" title="Upcoming Venues" size="label" />
            <div className="mt-8">
              <UpcomingVenues championships={upcomingChampionships} />
            </div>
          </div>
        ) : null}

        {/* The roll of courses sits in 1226 on The Open while the band above it keeps the full
            1366 -- the same narrowing as the Previous Opens list, and nested for the same reason:
            tailwind-merge does not recognise max-w-container, so passing a width to Container
            looks applied and does nothing. The heading drops to their quiet 14/700 label so the
            course names are the loudest thing here. */}
        <div className="mx-auto w-full max-w-[1226px]">
          <SectionHeading eyebrow="The Rotation" title="Venues past and present" size="label" />
          <div className="mt-8 flex flex-col divide-y divide-border border-y border-border">
            {venues.map((venue) => (
              <VenueListItem key={venue.slug} venue={venue} />
            ))}
          </div>
        </div>
      </Container>
    </>
  );
}
