import type { Metadata } from "next";

import { PageHero } from "@/components/shared/page-hero";
import { FieldView } from "@/components/field/field-view";
import { loadFieldPage } from "@/lib/data/field-page";
import { getSeoSettings } from "@/lib/data/seo-settings";

// See src/app/(app)/page.tsx for why this route is force-dynamic.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoSettings();
  return { title: seo.field.title, description: seo.field.description };
}

export default async function FieldPage() {
  const { sorted, debutantIds, championshipHistory, banners, theme, description } = await loadFieldPage();
  return (
    <>
      <PageHero
        variant="photo"
        size="compact"
        imageLabel="The field walking down the 1st fairway"
        imageUrl={banners.fieldUrl}
        eyebrow={banners.fieldEyebrow}
        title={banners.fieldTitle}
        description={description}
      />
      <FieldView players={sorted} debutantIds={debutantIds} championshipHistory={championshipHistory} championLogoUrl={theme.championBadgeUrl} />
    </>
  );
}
