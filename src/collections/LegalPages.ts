import type { CollectionConfig } from "payload";

import { revalidateLegalPages } from "@/lib/revalidate";
import { slugify } from "@/lib/utils";

export const LegalPages: CollectionConfig = {
  slug: "legal-pages",
  labels: { singular: "Legal Page", plural: "Legal Pages" },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "slug", "updatedAt"],
    description: "Privacy Policy, Cookie Policy, Website Terms, Modern Slavery Statement, and any other simple legal copy page.",
    components: {
      edit: {
        beforeDocumentControls: ["/components/admin/RecordNav#RecordNav"],
      },
    },
  },
  access: {
    read: () => true,
  },
  fields: [
    { name: "title", type: "text", required: true },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      index: true,
      admin: {
        position: "sidebar",
        description: "Used in the page URL, e.g. /legal/privacy-policy. Auto-filled from the title if left blank.",
      },
    },
    { name: "body", type: "richText", required: true },
  ],
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (data && !data.slug && data.title) {
          data.slug = slugify(data.title);
        }
        return data;
      },
    ],
    afterChange: [revalidateLegalPages],
    afterDelete: [revalidateLegalPages],
  },
};
