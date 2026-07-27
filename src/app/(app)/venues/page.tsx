import type { Metadata } from "next";

import { PageHero } from "@/components/shared/page-hero";
import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { FeaturedVenueCard } from "@/components/venues/featured-venue-card";
import { VenueListItem } from "@/components/venues/venue-list-item";
import { getVenues } from "@/lib/data/venues";
import { getPageBanners } from "@/lib/data/page-banners";

export const metadata: Metadata = {
  title: "Venues",
  description: "Every course to have hosted The Legs Open.",
};

export default async function VenuesPage() {
  const [venues, banners] = await Promise.all([getVenues(), getPageBanners()]);

  const featured = venues.reduce<(typeof venues)[number] | undefined>(
    (mostHosted, venue) => (!mostHosted || venue.timesHosted > mostHosted.timesHosted ? venue : mostHosted),
    undefined,
  );
  const rest = venues.filter((venue) => venue.slug !== featured?.slug);

  return (
    <>
      <PageHero
        variant="photo"
        imageLabel="Aerial view of a links course in the rotation"
        imageUrl={banners.venuesUrl}
        eyebrow={banners.venuesEyebrow}
        title={banners.venuesTitle}
        description={banners.venuesDescription}
      />
      <Container className="flex flex-col gap-16 py-16 sm:py-24">
        {featured ? (
          <div>
            <SectionHeading eyebrow="Home Venue" title="Where it all began" />
            <div className="mt-8">
              <FeaturedVenueCard venue={featured} />
            </div>
          </div>
        ) : null}

        <div>
          <SectionHeading eyebrow="The Rotation" title="Venues past and present" />
          <div className="mt-8 flex flex-col divide-y divide-border border-y border-border">
            {rest.map((venue) => (
              <VenueListItem key={venue.slug} venue={venue} />
            ))}
          </div>
        </div>
      </Container>
    </>
  );
}
