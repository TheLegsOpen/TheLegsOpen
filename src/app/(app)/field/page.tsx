import type { Metadata } from "next";

import { PageHero } from "@/components/shared/page-hero";
import { FieldView } from "@/components/field/field-view";
import { getPlayers } from "@/lib/data/players";
import { getChampionshipHistory } from "@/lib/data/championships";
import { getPageBanners } from "@/lib/data/page-banners";
import { getSiteTheme } from "@/lib/data/site-theme";

export const metadata: Metadata = {
  title: "Field",
  description: "The full field of players competing at The Legs Open.",
};

export default async function FieldPage() {
  const [players, championshipHistory, banners, theme] = await Promise.all([
    getPlayers(),
    getChampionshipHistory(),
    getPageBanners(),
    getSiteTheme(),
  ]);
  const sorted = [...players].sort((a, b) => {
    const aSurname = a.name.split(" ").slice(-1)[0];
    const bSurname = b.name.split(" ").slice(-1)[0];
    return aSurname.localeCompare(bSurname);
  });

  return (
    <>
      <PageHero
        variant="photo"
        imageLabel="The field walking down the 1st fairway"
        imageUrl={banners.fieldUrl}
        eyebrow={banners.fieldEyebrow}
        title={banners.fieldTitle}
        description={`${sorted.length} players competing at Seabrook Old Course this week.`}
      />
      <FieldView players={sorted} championshipHistory={championshipHistory} championLogoUrl={theme.championBadgeUrl} />
    </>
  );
}
