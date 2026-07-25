import type { Metadata } from "next";

import { PageHero } from "@/components/shared/page-hero";
import { Container } from "@/components/shared/container";
import { VenueCard } from "@/components/venues/venue-card";
import { getVenues } from "@/lib/data/venues";
import { getPageBanners } from "@/lib/data/page-banners";

export const metadata: Metadata = {
  title: "Venues",
  description: "Every course to have hosted The Legs Open.",
};

export default async function VenuesPage() {
  const [venues, banners] = await Promise.all([getVenues(), getPageBanners()]);

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
      <Container className="py-16 sm:py-24">
        <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {venues.map((venue) => (
            <VenueCard key={venue.slug} venue={venue} />
          ))}
        </div>
      </Container>
    </>
  );
}
