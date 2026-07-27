import { getPayload } from "payload";

import configPromise from "@/payload.config";
import type { IconOption } from "@/lib/icon-options";

export interface CareersPageValue {
  icon: IconOption;
  title: string;
  description: string;
}

export interface CareersPageRole {
  title: string;
  location: string;
  type: string;
}

export interface CareersPageSettings {
  heroEyebrow?: string;
  heroTitle: string;
  heroDescription: string;
  valuesEyebrow?: string;
  valuesTitle: string;
  values: CareersPageValue[];
  rolesEyebrow?: string;
  rolesTitle: string;
  openRoles: CareersPageRole[];
  ctaTitle: string;
  ctaDescription: string;
  ctaButtonLabel: string;
}

export async function getCareersPageSettings(): Promise<CareersPageSettings> {
  const payload = await getPayload({ config: configPromise });
  const settings = await payload.findGlobal({ slug: "careers-page" });

  return {
    heroEyebrow: settings.heroEyebrow ?? undefined,
    heroTitle: settings.heroTitle,
    heroDescription: settings.heroDescription,
    valuesEyebrow: settings.valuesEyebrow ?? undefined,
    valuesTitle: settings.valuesTitle,
    values: (settings.values ?? []).map((value) => ({
      icon: value.icon,
      title: value.title,
      description: value.description,
    })),
    rolesEyebrow: settings.rolesEyebrow ?? undefined,
    rolesTitle: settings.rolesTitle,
    openRoles: (settings.openRoles ?? []).map((role) => ({
      title: role.title,
      location: role.location,
      type: role.type,
    })),
    ctaTitle: settings.ctaTitle,
    ctaDescription: settings.ctaDescription,
    ctaButtonLabel: settings.ctaButtonLabel,
  };
}
