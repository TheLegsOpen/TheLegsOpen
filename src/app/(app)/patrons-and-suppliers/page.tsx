import type { Metadata } from "next";

import { PageHero } from "@/components/shared/page-hero";
import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { PATRONS, OFFICIAL_SUPPLIERS } from "@/data/sponsors";

export const metadata: Metadata = {
  title: "Patrons & Suppliers",
  description: "The patrons and official suppliers who support The Legs Open.",
};

function BrandWall({ names }: { names: readonly string[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {names.map((name) => (
        <div
          key={name}
          className="flex h-24 items-center justify-center border border-border px-4 text-center transition-colors hover:border-primary/30 hover:bg-secondary"
        >
          <span className="font-display text-lg font-bold">{name}</span>
        </div>
      ))}
    </div>
  );
}

export default function PatronsAndSuppliersPage() {
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
            <BrandWall names={PATRONS} />
          </div>
        </div>

        <div>
          <SectionHeading eyebrow="Suppliers" title="Official suppliers" />
          <div className="mt-10">
            <BrandWall names={OFFICIAL_SUPPLIERS} />
          </div>
        </div>
      </Container>
    </>
  );
}
