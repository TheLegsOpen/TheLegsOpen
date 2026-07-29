import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { mediaUrl } from "@/lib/utils";
import { getActiveChampionship } from "@/lib/data/scorecards";
import type { Venue } from "@/payload-types";

export type ClockFont = "display" | "timekeeper";

export interface SponsorClock {
  name: string;
  tagline: string;
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

const DEFAULTS: SponsorClock = {
  name: "Meridian",
  tagline: "Official Timekeeper",
  faceColor: "#0E3D2C",
  clockFont: "display",
  venueName: "Seabrook Old Course",
};

export async function getSponsorClock(): Promise<SponsorClock> {
  const payload = await getPayload({ config: configPromise });
  const [settings, championship] = await Promise.all([
    payload.findGlobal({ slug: "sponsor-clock" }),
    getActiveChampionship(payload),
  ]);
  const venue = championship && typeof championship.venue === "object" ? (championship.venue as Venue) : undefined;

  return {
    name: settings.sponsor?.name || DEFAULTS.name,
    tagline: settings.sponsor?.tagline || DEFAULTS.tagline,
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
