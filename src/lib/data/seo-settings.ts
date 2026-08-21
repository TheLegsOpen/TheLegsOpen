import { getPayload } from "payload";

import configPromise from "@/payload.config";

export interface PageSEO {
  title: string;
  description: string;
}

export interface SEOSettings {
  home: PageSEO;
  leaderboard: PageSEO;
  teeTimes: PageSEO;
  records: PageSEO;
  statistics: PageSEO;
  field: PageSEO;
  venues: PageSEO;
  liveBlog: PageSEO;
  latest: PageSEO;
  previousOpens: PageSEO;
  club: PageSEO;
  patrons: PageSEO;
  careers: PageSEO;
  media: PageSEO;
  contact: PageSEO;
}

/** Mirrors the `defaultValue`s in globals/SEOSettings.ts -- kept here too so a blank field (or a
 * Global row that predates a newly added field) still falls back to the site's original copy
 * instead of an empty <title>. */
const DEFAULTS: SEOSettings = {
  home: {
    title: "The Legs Open | Golf's original walk down the fairway.",
    description:
      "The home of The Legs Open — championship news, tickets & hospitality, tee times, leaderboards and the story of the game's most storied links championship.",
  },
  leaderboard: { title: "Leaderboard", description: "Live scoring for The Legs Open — Main, Stableford and Scratch competitions." },
  teeTimes: { title: "Tee Times", description: "Round-by-round tee times for The Legs Open at Seabrook Old Course." },
  records: { title: "Records & Statistics", description: "Records and statistics from the full history of The Legs Open." },
  statistics: { title: "Statistics", description: "Nett and Scratch scoring statistics by hole par for The Legs Open." },
  field: { title: "Field", description: "The full field of players competing at The Legs Open." },
  venues: { title: "Venues", description: "Every course to have hosted The Legs Open." },
  liveBlog: { title: "Live Blog", description: "Live updates from The Legs Open — birdies, bogeys and lead changes as they happen." },
  latest: { title: "Latest News", description: "News, features and the greatest stories from The Legs Open." },
  previousOpens: { title: "Previous Opens", description: "The full roll of honour for The Legs Open, since 1948." },
  club: {
    title: "The Clubhouse",
    description: "Free membership with priority access to news, a members' newsletter, and championship week invitations.",
  },
  patrons: { title: "Patrons & Suppliers", description: "The patrons and official suppliers who support The Legs Open." },
  careers: { title: "Careers", description: "Work at The Legs Open — year-round and championship week roles." },
  media: { title: "Media Centre", description: "Press accreditation, media contacts and resources for The Legs Open." },
  contact: { title: "Contact Us", description: "Get in touch with The Legs Open ticket office, membership team, or media centre." },
};

export async function getSeoSettings(): Promise<SEOSettings> {
  const payload = await getPayload({ config: configPromise });
  const settings = await payload.findGlobal({ slug: "seo-settings" });

  return {
    home: { title: settings.homeTitle || DEFAULTS.home.title, description: settings.homeDescription || DEFAULTS.home.description },
    leaderboard: {
      title: settings.leaderboardTitle || DEFAULTS.leaderboard.title,
      description: settings.leaderboardDescription || DEFAULTS.leaderboard.description,
    },
    teeTimes: {
      title: settings.teeTimesTitle || DEFAULTS.teeTimes.title,
      description: settings.teeTimesDescription || DEFAULTS.teeTimes.description,
    },
    records: { title: settings.recordsTitle || DEFAULTS.records.title, description: settings.recordsDescription || DEFAULTS.records.description },
    statistics: {
      title: settings.statisticsTitle || DEFAULTS.statistics.title,
      description: settings.statisticsDescription || DEFAULTS.statistics.description,
    },
    field: { title: settings.fieldTitle || DEFAULTS.field.title, description: settings.fieldDescription || DEFAULTS.field.description },
    venues: { title: settings.venuesTitle || DEFAULTS.venues.title, description: settings.venuesDescription || DEFAULTS.venues.description },
    liveBlog: {
      title: settings.liveBlogTitle || DEFAULTS.liveBlog.title,
      description: settings.liveBlogDescription || DEFAULTS.liveBlog.description,
    },
    latest: { title: settings.latestTitle || DEFAULTS.latest.title, description: settings.latestDescription || DEFAULTS.latest.description },
    previousOpens: {
      title: settings.previousOpensTitle || DEFAULTS.previousOpens.title,
      description: settings.previousOpensDescription || DEFAULTS.previousOpens.description,
    },
    club: { title: settings.clubTitle || DEFAULTS.club.title, description: settings.clubDescription || DEFAULTS.club.description },
    patrons: { title: settings.patronsTitle || DEFAULTS.patrons.title, description: settings.patronsDescription || DEFAULTS.patrons.description },
    careers: { title: settings.careersTitle || DEFAULTS.careers.title, description: settings.careersDescription || DEFAULTS.careers.description },
    media: { title: settings.mediaTitle || DEFAULTS.media.title, description: settings.mediaDescription || DEFAULTS.media.description },
    contact: { title: settings.contactTitle || DEFAULTS.contact.title, description: settings.contactDescription || DEFAULTS.contact.description },
  };
}
