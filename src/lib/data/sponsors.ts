import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { mediaUrl } from "@/lib/utils";
import { PATRONS, OFFICIAL_SUPPLIERS } from "@/data/sponsors";

export interface SponsorEntry {
  name: string;
  logoUrl?: string;
}

export interface Sponsors {
  patrons: SponsorEntry[];
  officialSuppliers: SponsorEntry[];
}

export async function getSponsors(): Promise<Sponsors> {
  const payload = await getPayload({ config: configPromise });
  const settings = await payload.findGlobal({ slug: "sponsors" });

  const patrons = settings.patrons?.length
    ? settings.patrons.map((entry) => ({ name: entry.name, logoUrl: mediaUrl(entry.logo) }))
    : PATRONS.map((name) => ({ name }));

  const officialSuppliers = settings.officialSuppliers?.length
    ? settings.officialSuppliers.map((entry) => ({ name: entry.name, logoUrl: mediaUrl(entry.logo) }))
    : OFFICIAL_SUPPLIERS.map((name) => ({ name }));

  return { patrons, officialSuppliers };
}
