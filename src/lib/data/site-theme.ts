import { getPayload } from "payload";
import { unstable_cache } from "next/cache";

import configPromise from "@/payload.config";
import { mediaUrl } from "@/lib/utils";

export type FontPreset = "fraunces-inter" | "playfair-source-sans" | "newsreader-manrope";

export interface SiteTheme {
  primaryColor: string;
  accentColor: string;
  logoUrl?: string;
  faviconUrl?: string;
  championBadgeUrl?: string;
  championWinnerBadgeUrl?: string;
  championTrophyGraphicUrl?: string;
  fontPreset: FontPreset;
  showBreadcrumbs: boolean;
}

const DEFAULTS: SiteTheme = {
  primaryColor: "#06051E",
  accentColor: "#FFB800",
  fontPreset: "fraunces-inter",
  showBreadcrumbs: true,
};

// This global is fetched on essentially every request site-wide (every layout render), so it's
// one of the biggest single contributors to connection pressure on Supabase's session pooler --
// see the pool max: 1 comment in payload.config.ts. It changes rarely (branding/colors), so a 60s
// cache cuts that to at most once per minute instead of once per request.
const getCachedSiteThemeDoc = unstable_cache(
  async () => {
    const payload = await getPayload({ config: configPromise });
    return payload.findGlobal({ slug: "site-theme" });
  },
  ["site-theme"],
  { revalidate: 60 },
);

export async function getSiteTheme(): Promise<SiteTheme> {
  // Falls back to plain defaults instead of throwing -- this is cosmetic (colors/branding), not
  // worth taking down a whole page over if Supabase's pooler is having one of its intermittent
  // connection-timeout episodes (see payload.config.ts). The layout that calls this on every
  // request should degrade to default styling, not 500.
  let settings: Awaited<ReturnType<typeof getCachedSiteThemeDoc>>;
  try {
    settings = await getCachedSiteThemeDoc();
  } catch {
    return DEFAULTS;
  }

  return {
    primaryColor: settings.colors?.primaryColor || DEFAULTS.primaryColor,
    accentColor: settings.colors?.accentColor || DEFAULTS.accentColor,
    logoUrl: mediaUrl(settings.branding?.logo),
    faviconUrl: mediaUrl(settings.branding?.favicon),
    championBadgeUrl: mediaUrl(settings.branding?.championBadge),
    championWinnerBadgeUrl: mediaUrl(settings.branding?.championWinnerBadge),
    championTrophyGraphicUrl: mediaUrl(settings.branding?.championTrophyGraphic),
    fontPreset: settings.fontPreset || DEFAULTS.fontPreset,
    showBreadcrumbs: settings.showBreadcrumbs ?? DEFAULTS.showBreadcrumbs,
  };
}
