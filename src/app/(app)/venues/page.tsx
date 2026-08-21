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
            <SectionHeading eyebrow="Upcoming" title="Upcoming Venues" />
            <div className="mt-8">
              <UpcomingVenues championships={upcomingChampionships} />
            </div>
          </div>
        ) : null}

        <div>
          <SectionHeading eyebrow="The Rotation" title="Venues past and present" />
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
