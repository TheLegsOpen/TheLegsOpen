import type { Metadata } from "next";

import { PageHero } from "@/components/shared/page-hero";
import { FieldView } from "@/components/field/field-view";
import { getFieldPlayers } from "@/lib/data/players";
import { getChampionshipHistory, getActiveChampionshipSummary } from "@/lib/data/championships";
import { getPageBanners } from "@/lib/data/page-banners";
import { getSiteTheme } from "@/lib/data/site-theme";
import { ordinal } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Field",
  description: "The full field of players competing at The Legs Open.",
};

export default async function FieldPage() {
  const [activeChampionship, players, championshipHistory, banners, theme] = await Promise.all([
    getActiveChampionshipSummary(),
    getFieldPlayers(),
    getChampionshipHistory(),
    getPageBanners(),
    getSiteTheme(),
  ]);
  const sorted = [...players].sort((a, b) => {
    const aSurname = a.name.split(" ").slice(-1)[0];
    const bSurname = b.name.split(" ").slice(-1)[0];
    return aSurname.localeCompare(bSurname);
  });

  const description = activeChampionship
    ? `The following players are in the field at The ${ordinal(activeChampionship.ordinal)} Legs Open at ${activeChampionship.venueName}.`
    : "The full field of players competing at The Legs Open.";

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
      <FieldView players={sorted} championshipHistory={championshipHistory} championLogoUrl={theme.championBadgeUrl} />
    </>
  );
}
