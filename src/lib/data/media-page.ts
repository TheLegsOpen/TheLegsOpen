import { getPayload } from "payload";

import configPromise from "@/payload.config";
import type { IconOption } from "@/lib/icon-options";

export interface MediaPageResource {
  icon: IconOption;
  title: string;
  description: string;
}

export interface MediaPageSettings {
  heroEyebrow?: string;
  heroTitle: string;
  heroDescription: string;
  resourcesEyebrow?: string;
  resourcesTitle: string;
  resources: MediaPageResource[];
  ctaTitle: string;
  ctaDescription: string;
  ctaButtonLabel: string;
}

export async function getMediaPageSettings(): Promise<MediaPageSettings> {
  const payload = await getPayload({ config: configPromise });
  const settings = await payload.findGlobal({ slug: "media-page" });

  return {
    heroEyebrow: settings.heroEyebrow ?? undefined,
    heroTitle: settings.heroTitle,
    heroDescription: settings.heroDescription,
    resourcesEyebrow: settings.resourcesEyebrow ?? undefined,
    resourcesTitle: settings.resourcesTitle,
    resources: (settings.resources ?? []).map((resource) => ({
      icon: resource.icon,
      title: resource.title,
      description: resource.description,
    })),
    ctaTitle: settings.ctaTitle,
    ctaDescription: settings.ctaDescription,
    ctaButtonLabel: settings.ctaButtonLabel,
  };
}
