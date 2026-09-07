import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { mediaUrl } from "@/lib/utils";
import { getActiveChampionship } from "@/lib/data/scorecards";
import type { Venue } from "@/payload-types";

export type ClockFont = "display" | "timekeeper";

export interface SponsorClock {
  name: string;
  tagline?: string;
  logoUrl?: string;
  faceColor: string;
  clockFont: ClockFont;
  venueName: string;
  faceImageUrl?: string;
  faceImageRetinaUrl?: string;
  hourHandUrl?: string;
  minuteHandUrl?: string;
  secondHandUrl?: string;
  centerCapUrl?: string;
}

const DEFAULTS: Omit<SponsorClock, "tagline"> = {
  name: "Meridian",
  faceColor: "#0E3D2C",
  clockFont: "display",
  venueName: "Seabrook Old Course",
};

async function fetchSponsorClock(): Promise<SponsorClock> {
  const payload = await getPayload({ config: configPromise });
  const [settings, championship] = await Promise.all([
    payload.findGlobal({ slug: "sponsor-clock" }),
    getActiveChampionship(payload),
  ]);
  const venue = championship && typeof championship.venue === "object" ? (championship.venue as Venue) : undefined;

  return {
    name: settings.sponsor?.name || DEFAULTS.name,
    tagline: settings.sponsor?.tagline || undefined,
    logoUrl: mediaUrl(settings.sponsor?.logo),
    faceColor: settings.sponsor?.faceColor || DEFAULTS.faceColor,
    clockFont: (settings.sponsor?.clockFont as ClockFont) || DEFAULTS.clockFont,
    venueName: venue?.name || DEFAULTS.venueName,
    faceImageUrl: mediaUrl(settings.graphics?.faceImage),
    faceImageRetinaUrl: mediaUrl(settings.graphics?.faceImageRetina),
    hourHandUrl: mediaUrl(settings.graphics?.hourHand),
    minuteHandUrl: mediaUrl(settings.graphics?.minuteHand),
    secondHandUrl: mediaUrl(settings.graphics?.secondHand),
    centerCapUrl: mediaUrl(settings.graphics?.centerCap),
  };
}

const FALLBACK: SponsorClock = { ...DEFAULTS, tagline: undefined };

// Falls back to plain defaults instead of throwing -- see the same fallback on getSiteTheme
// (src/lib/data/site-theme.ts) for why: a Supabase pooler timeout shouldn't 500 a whole page.
export async function getSponsorClock(): Promise<SponsorClock> {
  try {
    return await fetchSponsorClock();
  } catch {
    return FALLBACK;
  }
}
