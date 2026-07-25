import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { mediaUrl } from "@/lib/utils";

export type FontPreset = "fraunces-inter" | "playfair-source-sans" | "newsreader-manrope";

export interface SiteTheme {
  primaryColor: string;
  accentColor: string;
  logoUrl?: string;
  faviconUrl?: string;
  championBadgeUrl?: string;
  fontPreset: FontPreset;
}

const DEFAULTS: SiteTheme = {
  primaryColor: "#06051E",
  accentColor: "#FFB800",
  fontPreset: "fraunces-inter",
};

export async function getSiteTheme(): Promise<SiteTheme> {
  const payload = await getPayload({ config: configPromise });
  const settings = await payload.findGlobal({ slug: "site-theme" });

  return {
    primaryColor: settings.colors?.primaryColor || DEFAULTS.primaryColor,
    accentColor: settings.colors?.accentColor || DEFAULTS.accentColor,
    logoUrl: mediaUrl(settings.branding?.logo),
    faviconUrl: mediaUrl(settings.branding?.favicon),
    championBadgeUrl: mediaUrl(settings.branding?.championBadge),
    fontPreset: settings.fontPreset || DEFAULTS.fontPreset,
  };
}
