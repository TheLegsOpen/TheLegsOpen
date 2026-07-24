import { getPayload } from "payload";

import configPromise from "@/payload.config";
import type { Media } from "@/payload-types";

export type FontPreset = "fraunces-inter" | "playfair-source-sans" | "newsreader-manrope";

export interface SiteTheme {
  primaryColor: string;
  accentColor: string;
  logoUrl?: string;
  faviconUrl?: string;
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

  const logo = typeof settings.branding?.logo === "object" ? (settings.branding.logo as Media) : undefined;
  const favicon = typeof settings.branding?.favicon === "object" ? (settings.branding.favicon as Media) : undefined;

  return {
    primaryColor: settings.colors?.primaryColor || DEFAULTS.primaryColor,
    accentColor: settings.colors?.accentColor || DEFAULTS.accentColor,
    logoUrl: logo?.url ?? undefined,
    faviconUrl: favicon?.url ?? undefined,
    fontPreset: settings.fontPreset || DEFAULTS.fontPreset,
  };
}
