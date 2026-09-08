import { getPayload } from "payload";

import configPromise from "@/payload.config";
import type { LegalPage as LegalPageDoc } from "@/payload-types";

export interface LegalPage {
  slug: string;
  title: string;
  updated: string;
  /** Raw Lexical document -- render with RichTextBlock (src/components/shared/rich-text.tsx). */
  body: unknown;
}

function mapLegalPage(doc: LegalPageDoc): LegalPage {
  return {
    slug: doc.slug,
    title: doc.title,
    updated: doc.updatedAt,
    body: doc.body,
  };
}

export async function getLegalPages(): Promise<LegalPage[]> {
  const payload = await getPayload({ config: configPromise });
  const { docs } = await payload.find({ collection: "legal-pages", limit: 100 });
  return docs.map(mapLegalPage);
}

export async function getLegalPage(slug: string): Promise<LegalPage | undefined> {
  const payload = await getPayload({ config: configPromise });
  const { docs } = await payload.find({
    collection: "legal-pages",
    where: { slug: { equals: slug } },
    limit: 1,
  });
  return docs[0] ? mapLegalPage(docs[0]) : undefined;
}

/**
 * Legal links for the footer's bottom bar, built from the pages that actually exist.
 *
 * These were previously hardcoded alongside the site's fixed links, so deleting a legal page in the
 * admin left a footer link pointing at a 404 -- Privacy Policy, Website Terms and Modern Slavery
 * Statement were all in that state.
 *
 * Sorted by title because the collection has no ordering field; add one if a specific order ever
 * matters. Returns [] on failure, since this renders in the root layout and a database blip should
 * cost the footer its legal links rather than every page on the site.
 */
export async function getFooterLegalLinks(): Promise<{ label: string; href: string }[]> {
  try {
    const payload = await getPayload({ config: configPromise });
    const { docs } = await payload.find({ collection: "legal-pages", limit: 100, depth: 0, sort: "title" });
    return docs
      .filter((doc) => doc.slug && doc.title)
      .map((doc) => ({ label: doc.title, href: `/legal/${doc.slug}` }));
  } catch {
    return [];
  }
}
