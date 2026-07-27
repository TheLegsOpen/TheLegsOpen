import { getPayload } from "payload";

import configPromise from "@/payload.config";

export interface ContactPageSettings {
  heroEyebrow?: string;
  heroTitle: string;
  heroDescription: string;
}

export async function getContactPageSettings(): Promise<ContactPageSettings> {
  const payload = await getPayload({ config: configPromise });
  const settings = await payload.findGlobal({ slug: "contact-page" });

  return {
    heroEyebrow: settings.heroEyebrow ?? undefined,
    heroTitle: settings.heroTitle,
    heroDescription: settings.heroDescription,
  };
}
