import type { Metadata } from "next";

import { PageHero } from "@/components/shared/page-hero";
import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { getSponsors, type SponsorEntry } from "@/lib/data/sponsors";

export const metadata: Metadata = {
  title: "Patrons & Suppliers",
  description: "The patrons and official suppliers who support The Legs Open.",
};

function BrandWall({ entries }: { entries: SponsorEntry[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {entries.map((entry) => (
        <div
          key={entry.name}
          className="flex h-24 items-center justify-center border border-border px-4 text-center transition-colors hover:border-primary/30 hover:bg-secondary"
        >
          {entry.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={entry.logoUrl} alt={entry.name} className="h-16 max-w-full object-contain" />
          ) : (
            <span className="font-display text-lg font-bold">{entry.name}</span>
          )}
        </div>
      ))}
    </div>
  );
}

export default async function PatronsAndSuppliersPage() {
  const { patrons, officialSuppliers } = await getSponsors();

  return (
    <>
      <PageHero
        eyebrow="Thank You"
        title="Patrons & suppliers"
        description="The Legs Open would not be possible without the support of our patrons and official suppliers."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Patrons & Suppliers" }]}
      />

      <Container className="flex flex-col gap-16 py-16 sm:py-24">
        <div>
          <SectionHeading eyebrow="Patrons" title="Our patrons" />
          <div className="mt-10">
            <BrandWall entries={patrons} />
          </div>
        </div>

        <div>
          <SectionHeading eyebrow="Suppliers" title="Official suppliers" />
          <div className="mt-10">
            <BrandWall entries={officialSuppliers} />
          </div>
        </div>
      </Container>
    </>
  );
}
