import type { Metadata } from "next";

import { PageHero } from "@/components/shared/page-hero";
import { Container } from "@/components/shared/container";
import { RecordsBoard } from "@/components/records/records-board";
import { getRecords } from "@/lib/data/records";
import { getPageBanners } from "@/lib/data/page-banners";

export const metadata: Metadata = {
  title: "Records & Statistics",
  description: "Records and statistics from the full history of The Legs Open.",
};

export default async function RecordsPage() {
  const [records, banners] = await Promise.all([getRecords(), getPageBanners()]);

  return (
    <>
      <PageHero
        variant="photo"
        size="compact"
        imageLabel="The Claret Vase engraved with every Legs Open champion"
        imageUrl={banners.recordsUrl}
        eyebrow={banners.recordsEyebrow}
        title={banners.recordsTitle}
        description={banners.recordsDescription}
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Records" }]}
      />
      <Container className="py-16 sm:py-24">
        <RecordsBoard records={records} />
      </Container>
    </>
  );
}
