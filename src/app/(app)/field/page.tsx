import type { Metadata } from "next";

import { PageHero } from "@/components/shared/page-hero";
import { FieldView } from "@/components/field/field-view";
import { getFieldPlayers } from "@/lib/data/players";
import { getChampionshipHistory, getActiveChampionshipSummary } from "@/lib/data/championships";
import { getPageBanners } from "@/lib/data/page-banners";
import { getSiteTheme } from "@/lib/data/site-theme";
import { ordinal } from "@/lib/utils";
import { hasBeenPlayed, isWithinLiveWindow } from "@/lib/data/championship-timing";
import { getSeoSettings } from "@/lib/data/seo-settings";

// See src/app/(app)/page.tsx for why this route is force-dynamic.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoSettings();
  return { title: seo.field.title, description: seo.field.description };
}

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

  /*
   * Written in the tense the championship is actually in.
   *
   * This used to read "the following players are in the field at ..." all year round, which is
   * only true during championship week. Out of season it announced a championship finished in
   * September as though it were under way -- and because the active championship stays ticked
   * between events by design (see the note on `isActive` in Championships), that is the state the
   * page is in for all but three days of the year.
   *
   * Not editable in the admin, incidentally: Page Banners carries the Field banner's image,
   * eyebrow and title, but this line is generated here.
   */
  const description = (() => {
    if (!activeChampionship) return "The full field of players competing at The Legs Open.";
    const event = `The ${ordinal(activeChampionship.ordinal)} Legs Open at ${activeChampionship.venueName}`;
    const timing = { year: activeChampionship.year, date: activeChampionship.effectiveDate };
    if (isWithinLiveWindow(timing)) return `The following players are in the field at ${event}.`;
    return hasBeenPlayed(timing) ? `The field that contested ${event}.` : `The field for ${event}.`;
  })();

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
