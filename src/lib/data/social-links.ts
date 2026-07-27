import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { mediaUrl } from "@/lib/utils";

export interface SocialLink {
  platform: string;
  label: string;
  iconUrl: string;
  url: string;
}

export async function getSocialLinks(): Promise<SocialLink[]> {
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
