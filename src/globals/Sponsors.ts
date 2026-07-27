import type { GlobalConfig } from "payload";

import { revalidateSite } from "@/lib/revalidate";

const LOGO_DESCRIPTION =
  "Shown in the footer's monochrome logo wall (rendered white regardless of the source colours, matching the rest of the row). Recommended: transparent PNG or SVG, landscape, at least 400×220px.";

const entryFields = (label: string) => [
  { name: "name", type: "text" as const, required: true, admin: { description: `${label} name — also used as alt text.` } },
  { name: "logo", type: "upload" as const, relationTo: "media" as const, required: true, admin: { description: LOGO_DESCRIPTION } },
];

export const Sponsors: GlobalConfig = {
  slug: "sponsors",
  label: "Patrons & Suppliers",
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [revalidateSite],
  },
  admin: {
    description: "Logos shown in the site footer. Falls back to the previous plain-text list for any entry with no logo uploaded yet.",
  },
  fields: [
    {
      name: "patrons",
      type: "array",
      labels: { singular: "Patron", plural: "Patrons" },
      fields: entryFields("Patron"),
    },
    {
      name: "officialSuppliers",
      label: "Official Suppliers",
      type: "array",
      labels: { singular: "Supplier", plural: "Official Suppliers" },
      fields: entryFields("Supplier"),
    },
  ],
};
