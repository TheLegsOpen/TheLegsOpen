import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { mediaUrl } from "@/lib/utils";

export interface PageBanners {
  leaderboardUrl?: string;
  leaderboardEyebrow?: string;
  leaderboardTitle: string;
  leaderboardDescription?: string;
  teeTimesUrl?: string;
  teeTimesEyebrow?: string;
  teeTimesTitle: string;
  teeTimesDescription?: string;
  venuesUrl?: string;
  venuesEyebrow?: string;
  venuesTitle: string;
  venuesDescription?: string;
  fieldUrl?: string;
  fieldEyebrow?: string;
  fieldTitle: string;
  statisticsUrl?: string;
  statisticsEyebrow?: string;
  statisticsTitle: string;
  statisticsDescription?: string;
  recordsUrl?: string;
  recordsEyebrow?: string;
  recordsTitle: string;
  recordsDescription?: string;
  liveBlogUrl?: string;
  liveBlogEyebrow?: string;
  liveBlogTitle: string;
  liveBlogDescription?: string;
  latestUrl?: string;
  latestEyebrow?: string;
  latestTitle: string;
  latestDescription?: string;
  playerProfileUrl?: string;
  playerProfileEyebrow?: string;
  previousOpensUrl?: string;
  previousOpensEyebrow?: string;
  previousOpensTitle: string;
  previousOpensDescription?: string;
}

const DEFAULTS = {
  leaderboardTitle: "Leaderboard",
  teeTimesTitle: "Tee times",
  venuesTitle: "Venues",
  fieldTitle: "The Field",
  statisticsTitle: "Statistics",
  recordsTitle: "Records & Statistics",
  liveBlogTitle: "Live Blog",
  latestTitle: "Latest from The Legs Open",
  previousOpensTitle: "Previous Opens",
} as const;

/**
 * Eyebrows and descriptions show exactly what the admin holds: empty means nothing on the page.
 * They used to fall back to wording written here, so a banner could show text (Records' "Since
 * 2013 / The roll of honour…") that appeared nowhere in the admin. Titles still fall back to the
 * page's name, since every page needs a heading.
 */
function optional(value: string | null | undefined): string | undefined {
  return value?.trim() ? value : undefined;
}

async function fetchPageBanners(): Promise<PageBanners> {
  const payload = await getPayload({ config: configPromise });
  const settings = await payload.findGlobal({ slug: "page-banners" });

  return {
    leaderboardUrl: mediaUrl(settings.leaderboard),
    leaderboardEyebrow: optional(settings.leaderboardEyebrow),
    leaderboardTitle: settings.leaderboardTitle || DEFAULTS.leaderboardTitle,
    leaderboardDescription: optional(settings.leaderboardDescription),
    teeTimesUrl: mediaUrl(settings.teeTimes),
    teeTimesEyebrow: optional(settings.teeTimesEyebrow),
    teeTimesTitle: settings.teeTimesTitle || DEFAULTS.teeTimesTitle,
    teeTimesDescription: optional(settings.teeTimesDescription),
    venuesUrl: mediaUrl(settings.venues),
    venuesEyebrow: optional(settings.venuesEyebrow),
    venuesTitle: settings.venuesTitle || DEFAULTS.venuesTitle,
    venuesDescription: optional(settings.venuesDescription),
    fieldUrl: mediaUrl(settings.field),
    fieldEyebrow: optional(settings.fieldEyebrow),
    fieldTitle: settings.fieldTitle || DEFAULTS.fieldTitle,
    statisticsUrl: mediaUrl(settings.statistics),
    statisticsEyebrow: optional(settings.statisticsEyebrow),
    statisticsTitle: settings.statisticsTitle || DEFAULTS.statisticsTitle,
    statisticsDescription: optional(settings.statisticsDescription),
    recordsUrl: mediaUrl(settings.records),
    recordsEyebrow: optional(settings.recordsEyebrow),
    recordsTitle: settings.recordsTitle || DEFAULTS.recordsTitle,
    recordsDescription: optional(settings.recordsDescription),
    liveBlogUrl: mediaUrl(settings.liveBlog),
    liveBlogEyebrow: optional(settings.liveBlogEyebrow),
    liveBlogTitle: settings.liveBlogTitle || DEFAULTS.liveBlogTitle,
    liveBlogDescription: optional(settings.liveBlogDescription),
    latestUrl: mediaUrl(settings.latest),
    latestEyebrow: optional(settings.latestEyebrow),
    latestTitle: settings.latestTitle || DEFAULTS.latestTitle,
    latestDescription: optional(settings.latestDescription),
    playerProfileUrl: mediaUrl(settings.playerProfile),
    previousOpensUrl: mediaUrl(settings.previousOpens),
    previousOpensEyebrow: optional(settings.previousOpensEyebrow),
    previousOpensTitle: settings.previousOpensTitle || DEFAULTS.previousOpensTitle,
    previousOpensDescription: optional(settings.previousOpensDescription),
    playerProfileEyebrow: optional(settings.playerProfileEyebrow),
  };
}

const FALLBACK: PageBanners = { ...DEFAULTS };

// Falls back to plain defaults instead of throwing -- see the same fallback on getSiteTheme
// (src/lib/data/site-theme.ts) for why: a Supabase pooler timeout shouldn't 500 a whole page.
export async function getPageBanners(): Promise<PageBanners> {
  try {
    return await fetchPageBanners();
  } catch {
    return FALLBACK;
  }
}
