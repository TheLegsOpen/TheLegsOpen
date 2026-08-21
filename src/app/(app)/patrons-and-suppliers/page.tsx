import type { Metadata } from "next";

import { PageHero } from "@/components/shared/page-hero";
import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { getSponsors, type SponsorEntry } from "@/lib/data/sponsors";
import { getSeoSettings } from "@/lib/data/seo-settings";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoSettings();
  return { title: seo.patrons.title, description: seo.patrons.description };
}

function BrandWall({ entries }: { entries: SponsorEntry[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {entries.map((entry) => {
        const content = entry.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={entry.logoUrl} alt={entry.name} className="h-16 max-w-full object-contain" />
        ) : (
          <span className="font-display text-lg font-bold">{entry.name}</span>
        );
        const tileClassName =
          "flex h-24 items-center justify-center border border-border px-4 text-center transition-colors hover:border-primary/30 hover:bg-secondary";

        return entry.websiteUrl ? (
          <a key={entry.name} href={entry.websiteUrl} target="_blank" rel="noopener noreferrer" className={tileClassName}>
            {content}
          </a>
        ) : (
          <div key={entry.name} className={tileClassName}>
            {content}
          </div>
        );
      })}
    </div>
  );
}

export default async function PatronsAndSuppliersPage() {
  const { pageEyebrow, pageTitle, pageDescription, patrons, officialSuppliers } = await getSponsors();

  return (
    <>
      <PageHero
        eyebrow={pageEyebrow}
        title={pageTitle}
        description={pageDescription}
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
