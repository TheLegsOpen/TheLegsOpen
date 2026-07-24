import { getPayload } from "payload";

import configPromise from "@/payload.config";
import type { Media } from "@/payload-types";

export interface SponsorClock {
  name: string;
  tagline: string;
  logoUrl?: string;
  faceColor: string;
  hourHandUrl?: string;
  minuteHandUrl?: string;
  secondHandUrl?: string;
  centerCapUrl?: string;
}

const DEFAULTS: SponsorClock = {
  name: "Meridian",
  tagline: "Official Timekeeper",
  faceColor: "#0E3D2C",
};

function mediaUrl(value: string | Media | null | undefined): string | undefined {
  return typeof value === "object" && value ? (value.url ?? undefined) : undefined;
}

export async function getSponsorClock(): Promise<SponsorClock> {
  const payload = await getPayload({ config: configPromise });
  const settings = await payload.findGlobal({ slug: "sponsor-clock" });

  return {
    name: settings.sponsor?.name || DEFAULTS.name,
    tagline: settings.sponsor?.tagline || DEFAULTS.tagline,
    logoUrl: mediaUrl(settings.sponsor?.logo),
    faceColor: settings.sponsor?.faceColor || DEFAULTS.faceColor,
    hourHandUrl: mediaUrl(settings.graphics?.hourHand),
    minuteHandUrl: mediaUrl(settings.graphics?.minuteHand),
    secondHandUrl: mediaUrl(settings.graphics?.secondHand),
    centerCapUrl: mediaUrl(settings.graphics?.centerCap),
  };
}
