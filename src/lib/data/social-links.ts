import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { mediaUrl } from "@/lib/utils";

export interface SocialLink {
  platform: string;
  label: string;
  iconUrl: string;
  url: string;
}

async function fetchSocialLinks(): Promise<SocialLink[]> {
  const payload = await getPayload({ config: configPromise });
  const settings = await payload.findGlobal({ slug: "social-links" });

  const links: SocialLink[] = [];
  for (const link of settings.links ?? []) {
    const iconUrl = mediaUrl(link.icon);
    if (!iconUrl || !link.url) continue;
    links.push({
      platform: link.platform,
      label: link.platform === "Other" ? link.label || "Other" : link.platform,
      iconUrl,
      url: link.url,
    });
  }
  return links;
}

// Falls back to an empty list instead of throwing -- see the fallback on getSiteTheme
// (src/lib/data/site-theme.ts) for why: a Supabase pooler timeout shouldn't 500 a whole page.
export async function getSocialLinks(): Promise<SocialLink[]> {
  try {
    return await fetchSocialLinks();
  } catch {
    return [];
  }
}
