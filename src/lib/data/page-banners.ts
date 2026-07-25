import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { mediaUrl } from "@/lib/utils";

export interface PageBanners {
  leaderboardUrl?: string;
  teeTimesUrl?: string;
  venuesUrl?: string;
  fieldUrl?: string;
}

export async function getPageBanners(): Promise<PageBanners> {
  const payload = await getPayload({ config: configPromise });
  const settings = await payload.findGlobal({ slug: "page-banners" });

  return {
    leaderboardUrl: mediaUrl(settings.leaderboard),
    teeTimesUrl: mediaUrl(settings.teeTimes),
    venuesUrl: mediaUrl(settings.venues),
    fieldUrl: mediaUrl(settings.field),
  };
}
