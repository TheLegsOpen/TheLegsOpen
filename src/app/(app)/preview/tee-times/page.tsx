import { PageHero } from "@/components/shared/page-hero";
import { ChampionshipWeekSwitcher } from "@/components/shared/championship-week-switcher";
import { TeeTimesView } from "@/components/tee-times/tee-times-view";
import { getTeeTimes, getTeeTimesForChampionshipId } from "@/lib/data/tee-times";
import { getActiveChampionshipId } from "@/lib/data/scorecards";
import { getArticles } from "@/lib/data/articles";
import { getSponsorClock } from "@/lib/data/sponsor-clock";
import { getPageBanners } from "@/lib/data/page-banners";
import { getCompetitionLeaderboard } from "@/lib/data/scorecards";
import {
  getNettScoringCategories,
  getScratchScoringCategories,
  getStreakCategories,
  getDrivingCategories,
  getApproachCategories,
  getPuttingCategories,
} from "@/lib/data/scoring-statistics";
import { getFieldChampionshipSummary } from "@/lib/data/championships";
import { ordinal } from "@/lib/utils";


// See the comment on src/app/(app)/page.tsx's own `revalidate` -- raised from 10s now that the
// per-hostname cache-splitting bug it worked around is fixed at the root (the domain redirect),
// and Supabase egress makes a 10s ceiling expensive to keep regardless. This page shows live
// per-hole "thru" progress during a round, and stays accurate via on-demand revalidation either way.
// See src/app/(app)/page.tsx for why this is force-dynamic instead of revalidate = 60.
export const dynamic = "force-dynamic";

/** PREVIEW of /tee-times with change 8 (player cards) and 28 (My players). */
export default async function TeeTimesPreviewPage() {
  const [
    rounds,
    articles,
    clockConfig,
    banners,
    mainEntries,
    stablefordEntries,
    scratchEntries,
    nettCategories,
    scratchCategories,
    streakCategories,
    drivingCategories,
    approachCategories,
    puttingCategories,
    nextChampionship,
  ] = await Promise.all([
    getTeeTimes(),
    getArticles(),
    getSponsorClock(),
    getPageBanners(),
    getCompetitionLeaderboard("main"),
    getCompetitionLeaderboard("stableford"),
    getCompetitionLeaderboard("scratch"),
    getNettScoringCategories(),
    getScratchScoringCategories(),
    getStreakCategories(),
    getDrivingCategories(),
    getApproachCategories(),
    getPuttingCategories(),
    getFieldChampionshipSummary(),
  ]);

  // Every tee sheet gets archived once its championship is over, which used to leave this page as
  // an empty column with a lone "Reverse order" button. Name the championship coming next instead,
  // using the Field page's rule (it looks ahead from 1 October).
  const emptyMessage = nextChampionship
    ? `Tee times for the ${ordinal(nextChampionship.ordinal)} Legs Open at ${nextChampionship.venueName} will be published nearer the championship.`
    : "Tee times will be published nearer the championship.";

  // Every live tee sheet is archived between championships, so show the last championship's sheet
  // to give the new cards something to show.
  const activeId = rounds.length === 0 ? await getActiveChampionshipId() : undefined;
  const shownRounds = rounds.length > 0 ? rounds : activeId ? await getTeeTimesForChampionshipId(activeId) : [];

  return (
    <>
      <PageHero
        variant="photo"
        size="slim"
        imageLabel="Practice range at first light"
        imageUrl={banners.teeTimesUrl}
        eyebrow={banners.teeTimesEyebrow}
        title={banners.teeTimesTitle}
        description={banners.teeTimesDescription}
        overlay={<ChampionshipWeekSwitcher onPhoto />}
      />
      <TeeTimesView
        rounds={shownRounds}
        cardVariant="cards"
        emptyMessage={emptyMessage}
        featuredArticle={articles[0]}
        clockConfig={clockConfig}
        mainEntries={mainEntries}
        stablefordEntries={stablefordEntries}
        scratchEntries={scratchEntries}
        nettCategories={nettCategories}
        scratchCategories={scratchCategories}
        streakCategories={streakCategories}
        drivingCategories={drivingCategories}
        approachCategories={approachCategories}
        puttingCategories={puttingCategories}
      />
    </>
  );
}
