import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { slugify } from "@/lib/utils";
import type { Venue } from "@/types/venue";
import type { Venue as PayloadVenue } from "@/payload-types";

/**
 * Data-access seam for venues — backed by the Venues collection in
 * Payload/Postgres rather than local fixtures.
 */

export function mapVenue(doc: PayloadVenue): Venue {
  return {
    slug: doc.slug ?? slugify(doc.name),
    name: doc.name,
    location: doc.location,
    region: doc.region,
    parYardage: doc.parYardage,
    timesHosted: doc.timesHosted,
    firstHosted: doc.firstHosted,
    lastHosted: doc.lastHosted,
    description: doc.description,
    overview: (doc.overview ?? []).map((entry) => entry.paragraph),
    stats: (doc.stats ?? []).map((stat) => ({ label: stat.label, value: stat.value })),
    imageLabel: doc.imageLabel,
  };
}

export async function getVenues(): Promise<Venue[]> {
  const payload = await getPayload({ config: configPromise });
  const result = await payload.find({ collection: "venues", limit: 100, sort: "name" });
  return result.docs.map(mapVenue);
}

export async function getVenueBySlug(slug: string): Promise<Venue | undefined> {
  const payload = await getPayload({ config: configPromise });
  const result = await payload.find({ collection: "venues", where: { slug: { equals: slug } }, limit: 1 });
  return result.docs[0] ? mapVenue(result.docs[0]) : undefined;
}

export async function getAllVenueSlugs(): Promise<string[]> {
  const payload = await getPayload({ config: configPromise });
  const result = await payload.find({ collection: "venues", limit: 100 });
  return result.docs.map((doc) => doc.slug ?? slugify(doc.name)).filter(Boolean);
}
