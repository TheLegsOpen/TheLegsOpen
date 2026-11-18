import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { mediaUrl } from "@/lib/utils";
import type { Media } from "@/payload-types";

export interface GridBackground {
  url: string;
  width: number;
  height: number;
}

/** The CSS object-position for each Focus choice in Page Banners. Centre (the browser default) is left unset. */
export const BANNER_FOCUS: Record<string, string | undefined> = {
  top: "50% 0%",
  upper: "50% 25%",
  centre: undefined,
  lower: "50% 75%",
  bottom: "50% 100%",
};

function bannerPosition(focus: string | null | undefined): string | undefined {
  return focus ? BANNER_FOCUS[focus] : undefined;
}

function gridBackground(value: string | number | Media | null | undefined): GridBackground | undefined {
  if (typeof value !== "object" || !value?.url || !value.width || !value.height) return undefined;
  return { url: value.url, width: value.width, height: value.height };
}

export interface PageBanners {
  leaderboardUrl?: string;
  leaderboardPosition?: string;
  leaderboardEyebrow?: string;
  leaderboardTitle: string;
  leaderboardDescription?: string;
  teeTimesUrl?: string;
  teeTimesPosition?: string;
  teeTimesEyebrow?: string;
  teeTimesTitle: string;
  teeTimesDescription?: string;
  venuesUrl?: string;
  venuesPosition?: string;
  venuesEyebrow?: string;
  venuesTitle: string;
  venuesDescription?: string;
  fieldUrl?: string;
  fieldPosition?: string;
  fieldEyebrow?: string;
  fieldTitle: string;
  /** The landscape behind the Field page's player tiles: its own upload, else the Field banner. */
  fieldGrid?: GridBackground;
  statisticsUrl?: string;
  statisticsPosition?: string;
  statisticsEyebrow?: string;
  statisticsTitle: string;
  statisticsDescription?: string;
  recordsUrl?: string;
  recordsPosition?: string;
  recordsEyebrow?: string;
  recordsTitle: string;
  recordsDescription?: string;
  liveBlogUrl?: string;
  liveBlogPosition?: string;
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
  previousOpensPosition?: string;
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
    leaderboardPosition: bannerPosition(settings.leaderboardFocus),
    leaderboardEyebrow: optional(settings.leaderboardEyebrow),
    leaderboardTitle: settings.leaderboardTitle || DEFAULTS.leaderboardTitle,
    leaderboardDescription: optional(settings.leaderboardDescription),
    teeTimesUrl: mediaUrl(settings.teeTimes),
    teeTimesPosition: bannerPosition(settings.teeTimesFocus),
    teeTimesEyebrow: optional(settings.teeTimesEyebrow),
    teeTimesTitle: settings.teeTimesTitle || DEFAULTS.teeTimesTitle,
    teeTimesDescription: optional(settings.teeTimesDescription),
    venuesUrl: mediaUrl(settings.venues),
    venuesPosition: bannerPosition(settings.venuesFocus),
    venuesEyebrow: optional(settings.venuesEyebrow),
    venuesTitle: settings.venuesTitle || DEFAULTS.venuesTitle,
    venuesDescription: optional(settings.venuesDescription),
    fieldUrl: mediaUrl(settings.field),
    fieldPosition: bannerPosition(settings.fieldFocus),
    fieldEyebrow: optional(settings.fieldEyebrow),
    fieldTitle: settings.fieldTitle || DEFAULTS.fieldTitle,
    fieldGrid: gridBackground(settings.fieldGridBackground) ?? gridBackground(settings.field),
    statisticsUrl: mediaUrl(settings.statistics),
    statisticsPosition: bannerPosition(settings.statisticsFocus),
    statisticsEyebrow: optional(settings.statisticsEyebrow),
    statisticsTitle: settings.statisticsTitle || DEFAULTS.statisticsTitle,
    statisticsDescription: optional(settings.statisticsDescription),
    recordsUrl: mediaUrl(settings.records),
    recordsPosition: bannerPosition(settings.recordsFocus),
    recordsEyebrow: optional(settings.recordsEyebrow),
    recordsTitle: settings.recordsTitle || DEFAULTS.recordsTitle,
    recordsDescription: optional(settings.recordsDescription),
    liveBlogUrl: mediaUrl(settings.liveBlog),
    liveBlogPosition: bannerPosition(settings.liveBlogFocus),
    liveBlogEyebrow: optional(settings.liveBlogEyebrow),
    liveBlogTitle: settings.liveBlogTitle || DEFAULTS.liveBlogTitle,
    liveBlogDescription: optional(settings.liveBlogDescription),
    latestUrl: mediaUrl(settings.latest),
    latestEyebrow: optional(settings.latestEyebrow),
    latestTitle: settings.latestTitle || DEFAULTS.latestTitle,
    latestDescription: optional(settings.latestDescription),
    playerProfileUrl: mediaUrl(settings.playerProfile),
    previousOpensUrl: mediaUrl(settings.previousOpens),
    previousOpensPosition: bannerPosition(settings.previousOpensFocus),
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
