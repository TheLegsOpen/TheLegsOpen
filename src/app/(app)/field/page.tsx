import type { Metadata } from "next";

import { PageHero } from "@/components/shared/page-hero";
import { FieldView } from "@/components/field/field-view";
import { getFieldPlayers } from "@/lib/data/players";
import { getAllScorecardParticipation } from "@/lib/data/scorecards";
import { getChampionshipHistory, getFieldChampionshipSummary } from "@/lib/data/championships";
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
  const [fieldChampionship, players, championshipHistory, banners, theme, participation] = await Promise.all([
    getFieldChampionshipSummary(),
    getFieldPlayers(),
    getChampionshipHistory(),
    getPageBanners(),
    getSiteTheme(),
    getAllScorecardParticipation(),
  ]);

  /*
   * A debutant has never started a round at any championship before the one this field is for.
   *
   * The filter used to test `previousOpens === 0`, but that field is only the hand-kept count from
   * before scorecards were digitised -- it is 0 for every player in the field, so the filter let
   * all thirty-six through. The scorecards are the real record (the player profile counts
   * appearances the same way). The hand-kept figure still counts, for anyone with pre-digital
   * appearances. Earlier championships only: a debutant at this year's event still has its card.
   */
  const fieldYear = fieldChampionship?.year ?? Number.POSITIVE_INFINITY;
  const yearByChampionshipId = new Map(championshipHistory.map((c) => [c.id, c.year]));
  const appearedBefore = new Set(
    participation
      .filter((p) => p.started && (yearByChampionshipId.get(p.championshipId) ?? Number.POSITIVE_INFINITY) < fieldYear)
      .map((p) => p.playerId),
  );
  const debutantIds = players.filter((p) => p.previousOpens === 0 && !appearedBefore.has(String(p.id))).map((p) => String(p.id));
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
    if (!fieldChampionship) return "The full field of players competing at The Legs Open.";
    const event = `The ${ordinal(fieldChampionship.ordinal)} Legs Open at ${fieldChampionship.venueName}`;
    const timing = { year: fieldChampionship.year, date: fieldChampionship.effectiveDate };
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
      <FieldView players={sorted} debutantIds={debutantIds} championshipHistory={championshipHistory} championLogoUrl={theme.championBadgeUrl} />
    </>
  );
}
