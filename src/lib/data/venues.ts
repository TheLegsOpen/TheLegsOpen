import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { mediaUrl, slugify } from "@/lib/utils";
import type { Venue } from "@/types/venue";
import type { Venue as PayloadVenue } from "@/payload-types";

/**
 * Data-access seam for venues — backed by the Venues collection in
 * Payload/Postgres rather than local fixtures.
 */

/**
 * Each overview row is a textarea, and every one of the fifteen venues has been filled in with
 * two paragraphs separated by a blank line inside a single row rather than one row each. The page
 * renders a row as one <p>, and HTML collapses that blank line to a space, so all fifteen were
 * reading as a single run-on block of six or seven hundred characters.
 *
 * Splitting here rather than in the page fixes every consumer at once, including the venue film
 * band, which takes overview[0] and was getting both paragraphs glued together. It also means the
 * admin can keep using whichever shape is convenient -- blank lines within a row, separate rows,
 * or a mix -- and the result is the same.
 */
function toParagraphs(rows: { paragraph: string }[]): string[] {
  return rows.flatMap((entry) =>
    entry.paragraph
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean),
  );
}

export function mapVenue(doc: PayloadVenue): Venue {
  return {
    slug: doc.slug ?? slugify(doc.name),
    name: doc.name,
    location: doc.location,
    region: doc.region,
    countryCode: doc.countryCode ?? undefined,
    country: doc.country ?? undefined,
    parYardage: doc.parYardage ?? undefined,
    timesHosted: doc.timesHosted,
    firstHosted: doc.firstHosted,
    lastHosted: doc.lastHosted,
    description: doc.description,
    overviewVideoUrl: doc.overviewVideoUrl ?? undefined,
    overview: toParagraphs(doc.overview ?? []),
    stats: (doc.stats ?? []).map((stat) => ({ label: stat.label, value: stat.value })),
    imageLabel: doc.imageLabel,
    imageUrl: mediaUrl(doc.image),
    gallery: (doc.gallery ?? []).map((photo) => ({ imageUrl: mediaUrl(photo.image), caption: photo.caption ?? undefined })),
    featuredArticleSlugs: (doc.featuredArticles ?? [])
      .map((article) => (typeof article === "object" ? (article.slug ?? slugify(article.title)) : undefined))
      .filter((slug): slug is string => Boolean(slug)),
  };
}

// Excludes isPractice venues -- those exist only to link a practice round's tee times/handicaps
// to a course, and shouldn't appear on the public Venues grid, sitemap, or venue page.
export async function getVenues(): Promise<Venue[]> {
  const payload = await getPayload({ config: configPromise });
  const result = await payload.find({ collection: "venues", where: { isPractice: { not_equals: true } }, limit: 100, sort: "name" });
  return result.docs.map(mapVenue);
}

// Deliberately unfiltered by isPractice -- a practice venue's own page still resolves if linked
// to directly, it's just never linked to from anywhere on the public site.
export async function getVenueBySlug(slug: string): Promise<Venue | undefined> {
  const payload = await getPayload({ config: configPromise });
  const result = await payload.find({ collection: "venues", where: { slug: { equals: slug } }, limit: 1 });
  return result.docs[0] ? mapVenue(result.docs[0]) : undefined;
}

export async function getAllVenueSlugs(): Promise<string[]> {
  const payload = await getPayload({ config: configPromise });
  const result = await payload.find({ collection: "venues", where: { isPractice: { not_equals: true } }, limit: 100 });
  return result.docs.map((doc) => doc.slug ?? slugify(doc.name)).filter(Boolean);
}
