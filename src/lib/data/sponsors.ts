import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { mediaUrl } from "@/lib/utils";
import { PATRONS, OFFICIAL_SUPPLIERS } from "@/data/sponsors";

export interface SponsorEntry {
  name: string;
  logoUrl?: string;
  websiteUrl?: string;
}

export interface Sponsors {
  pageEyebrow?: string;
  pageTitle: string;
  pageDescription: string;
  patrons: SponsorEntry[];
  officialSuppliers: SponsorEntry[];
}

const FALLBACK: Sponsors = {
  pageTitle: "Patrons & Suppliers",
  pageDescription: "The patrons and official suppliers who support The Legs Open.",
  patrons: PATRONS.map((name) => ({ name })),
  officialSuppliers: OFFICIAL_SUPPLIERS.map((name) => ({ name })),
};

async function fetchSponsors(): Promise<Sponsors> {
  const payload = await getPayload({ config: configPromise });
  const settings = await payload.findGlobal({ slug: "sponsors" });

  const patrons = settings.patrons?.length
    ? settings.patrons.map((entry) => ({
        name: entry.name,
        logoUrl: mediaUrl(entry.logo),
        websiteUrl: entry.websiteUrl ?? undefined,
      }))
    : PATRONS.map((name) => ({ name }));

  const officialSuppliers = settings.officialSuppliers?.length
    ? settings.officialSuppliers.map((entry) => ({
        name: entry.name,
        logoUrl: mediaUrl(entry.logo),
        websiteUrl: entry.websiteUrl ?? undefined,
      }))
    : OFFICIAL_SUPPLIERS.map((name) => ({ name }));

  return {
    pageEyebrow: settings.pageEyebrow ?? undefined,
    pageTitle: settings.pageTitle,
    pageDescription: settings.pageDescription,
    patrons,
    officialSuppliers,
  };
}

// Falls back to the local fixtures instead of throwing -- see the same fallback on getSiteTheme
// (src/lib/data/site-theme.ts) for why: a Supabase pooler timeout shouldn't 500 a whole page.
export async function getSponsors(): Promise<Sponsors> {
  try {
    return await fetchSponsors();
  } catch {
    return FALLBACK;
  }
}
