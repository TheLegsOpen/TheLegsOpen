import { getPayload } from "payload";

import configPromise from "@/payload.config";

export interface CookieBannerText {
  title: string;
  bodyParagraph1: string;
  bodyParagraph2?: string;
  acceptLabel: string;
  declineLabel: string;
}

const DEFAULTS: CookieBannerText = {
  title: "Your Cookies",
  bodyParagraph1: "Accepting all cookies helps this site remember your preferences between visits.",
  acceptLabel: "Accept all cookies",
  declineLabel: "Decline non-essential cookies",
};

export async function getCookieBannerText(): Promise<CookieBannerText> {
  const payload = await getPayload({ config: configPromise });
  const settings = await payload.findGlobal({ slug: "cookie-banner-settings" });

  return {
    title: settings.title || DEFAULTS.title,
    bodyParagraph1: settings.bodyParagraph1 || DEFAULTS.bodyParagraph1,
    bodyParagraph2: settings.bodyParagraph2 || undefined,
    acceptLabel: settings.acceptLabel || DEFAULTS.acceptLabel,
    declineLabel: settings.declineLabel || DEFAULTS.declineLabel,
  };
}
