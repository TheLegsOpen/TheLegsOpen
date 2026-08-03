import type { Metadata } from "next";

import { PageHero } from "@/components/shared/page-hero";
import { Container } from "@/components/shared/container";
import { RecordsBoard } from "@/components/records/records-board";
import { getRecords } from "@/lib/data/records";

export const metadata: Metadata = {
  title: "Records & Statistics",
  description: "Records and statistics from the full history of The Legs Open.",
};

export default async function RecordsPage() {
  const records = await getRecords();

  return (
    <>
      <PageHero
        eyebrow="Since 2013"
        title="Records & Statistics"
        description="The roll of honour, milestones and scoring records from The Legs Open's history."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Records" }]}
      />
      <Container className="py-16 sm:py-24">
        <RecordsBoard records={records} />
      </Container>
    </>
  );
}
