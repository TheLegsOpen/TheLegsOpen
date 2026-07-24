import type { Metadata } from "next";

import { PageHero } from "@/components/shared/page-hero";
import { Container } from "@/components/shared/container";
import { VenueCard } from "@/components/venues/venue-card";
import { VENUES } from "@/data/venues";

export const metadata: Metadata = {
  title: "Venues",
  description: "Every course to have hosted The Legs Open.",
};

export default function VenuesPage() {
  return (
    <>
      <PageHero
        variant="photo"
        imageLabel="Aerial view of a links course in the rotation"
        eyebrow="The Rotation"
        title="Venues"
        description="The links courses that make up The Legs Open rotation, past and future."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Venues" }]}
      />
      <Container className="py-16 sm:py-24">
        <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {VENUES.map((venue) => (
            <VenueCard key={venue.slug} venue={venue} />
          ))}
        </div>
      </Container>
    </>
  );
}
