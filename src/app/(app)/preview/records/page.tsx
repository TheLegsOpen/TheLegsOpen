import { PageHero } from "@/components/shared/page-hero";
import { Container } from "@/components/shared/container";
import { RecordsBoard } from "@/components/records/records-board";
import { RecordsBoardNext } from "@/components/preview/records-board-next";
import { getRecords } from "@/lib/data/records";
import { getPageBanners } from "@/lib/data/page-banners";
import { getPlayers } from "@/lib/data/players";

export const dynamic = "force-dynamic";

/** PREVIEW of /records with change 30: headline records in the Statistics leader-card style. */
export default async function RecordsPreviewPage() {
  const [records, banners, players] = await Promise.all([getRecords(), getPageBanners(), getPlayers()]);

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
      />
      <div className="bg-surface-dark text-surface-dark-foreground">
        <Container className="py-12 sm:py-16">
          <RecordsBoardNext records={records} players={players} />
        </Container>
      </div>
      <Container className="flex flex-col gap-6 py-16">
        <p className="text-sm text-muted-foreground">The full record book continues below in its current form (champion rolls, won on debut, playoffs and more).</p>
        <RecordsBoard records={records} />
      </Container>
    </>
  );
}
