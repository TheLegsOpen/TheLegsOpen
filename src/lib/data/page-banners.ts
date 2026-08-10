import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { mediaUrl } from "@/lib/utils";

export interface PageBanners {
  leaderboardUrl?: string;
  leaderboardEyebrow: string;
  leaderboardTitle: string;
  leaderboardDescription: string;
  teeTimesUrl?: string;
  teeTimesEyebrow: string;
  teeTimesTitle: string;
  teeTimesDescription: string;
  venuesUrl?: string;
  venuesEyebrow: string;
  venuesTitle: string;
  venuesDescription: string;
  fieldUrl?: string;
  fieldEyebrow: string;
  fieldTitle: string;
  statisticsUrl?: string;
  statisticsEyebrow: string;
  statisticsTitle: string;
  statisticsDescription: string;
  recordsUrl?: string;
  recordsEyebrow: string;
  recordsTitle: string;
  recordsDescription: string;
  liveBlogUrl?: string;
  liveBlogEyebrow: string;
  liveBlogTitle: string;
  liveBlogDescription: string;
  latestUrl?: string;
  latestEyebrow: string;
  latestTitle: string;
  latestDescription: string;
  playerProfileUrl?: string;
  playerProfileEyebrow: string;
}

const DEFAULTS = {
  leaderboardEyebrow: "Championship Week",
  leaderboardTitle: "Leaderboard",
  leaderboardDescription: "Live scoring from Seabrook Old Course. Star a player to follow them throughout the week.",
  teeTimesEyebrow: "Championship Week",
  teeTimesTitle: "Tee times",
  teeTimesDescription: "Starting times for every round, grouped by day. Star a player on the leaderboard to see them highlighted here.",
  venuesEyebrow: "The Rotation",
  venuesTitle: "Venues",
  venuesDescription: "The links courses that make up The Legs Open rotation, past and future.",
  fieldEyebrow: "Championship Week",
  fieldTitle: "The Field",
  statisticsEyebrow: "Championship Week",
  statisticsTitle: "Statistics",
  statisticsDescription: "Scoring statistics computed live from every player's scorecard.",
  recordsEyebrow: "Since 2013",
  recordsTitle: "Records & Statistics",
  recordsDescription: "The roll of honour, milestones and scoring records from The Legs Open's history.",
  liveBlogEyebrow: "Championship Week",
  liveBlogTitle: "Live Blog",
  liveBlogDescription: "Every notable moment from the course, as it happens.",
  latestEyebrow: "Latest",
  latestTitle: "News and features",
  latestDescription: "The greatest stories in golf, from championship week and beyond.",
  playerProfileEyebrow: "Player Profile",
} as const;

export async function getPageBanners(): Promise<PageBanners> {
  const payload = await getPayload({ config: configPromise });
  const settings = await payload.findGlobal({ slug: "page-banners" });

  return {
    leaderboardUrl: mediaUrl(settings.leaderboard),
    leaderboardEyebrow: settings.leaderboardEyebrow || DEFAULTS.leaderboardEyebrow,
    leaderboardTitle: settings.leaderboardTitle || DEFAULTS.leaderboardTitle,
    leaderboardDescription: settings.leaderboardDescription || DEFAULTS.leaderboardDescription,
    teeTimesUrl: mediaUrl(settings.teeTimes),
    teeTimesEyebrow: settings.teeTimesEyebrow || DEFAULTS.teeTimesEyebrow,
    teeTimesTitle: settings.teeTimesTitle || DEFAULTS.teeTimesTitle,
    teeTimesDescription: settings.teeTimesDescription || DEFAULTS.teeTimesDescription,
    venuesUrl: mediaUrl(settings.venues),
    venuesEyebrow: settings.venuesEyebrow || DEFAULTS.venuesEyebrow,
    venuesTitle: settings.venuesTitle || DEFAULTS.venuesTitle,
    venuesDescription: settings.venuesDescription || DEFAULTS.venuesDescription,
    fieldUrl: mediaUrl(settings.field),
    fieldEyebrow: settings.fieldEyebrow || DEFAULTS.fieldEyebrow,
    fieldTitle: settings.fieldTitle || DEFAULTS.fieldTitle,
    statisticsUrl: mediaUrl(settings.statistics),
    statisticsEyebrow: settings.statisticsEyebrow || DEFAULTS.statisticsEyebrow,
    statisticsTitle: settings.statisticsTitle || DEFAULTS.statisticsTitle,
    statisticsDescription: settings.statisticsDescription || DEFAULTS.statisticsDescription,
    recordsUrl: mediaUrl(settings.records),
    recordsEyebrow: settings.recordsEyebrow || DEFAULTS.recordsEyebrow,
    recordsTitle: settings.recordsTitle || DEFAULTS.recordsTitle,
    recordsDescription: settings.recordsDescription || DEFAULTS.recordsDescription,
    liveBlogUrl: mediaUrl(settings.liveBlog),
    liveBlogEyebrow: settings.liveBlogEyebrow || DEFAULTS.liveBlogEyebrow,
    liveBlogTitle: settings.liveBlogTitle || DEFAULTS.liveBlogTitle,
    liveBlogDescription: settings.liveBlogDescription || DEFAULTS.liveBlogDescription,
    latestUrl: mediaUrl(settings.latest),
    latestEyebrow: settings.latestEyebrow || DEFAULTS.latestEyebrow,
    latestTitle: settings.latestTitle || DEFAULTS.latestTitle,
    latestDescription: settings.latestDescription || DEFAULTS.latestDescription,
    playerProfileUrl: mediaUrl(settings.playerProfile),
    playerProfileEyebrow: settings.playerProfileEyebrow || DEFAULTS.playerProfileEyebrow,
  };
}
