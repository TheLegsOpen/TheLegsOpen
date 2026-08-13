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
