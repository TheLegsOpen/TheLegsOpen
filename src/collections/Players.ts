import type { CollectionConfig } from "payload";

import { COUNTRIES, countryName } from "@/data/countries";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const Players: CollectionConfig = {
  slug: "players",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "country", "age", "previousOpens"],
  },
  access: {
    read: () => true,
  },
  fields: [
    { name: "name", type: "text", required: true },
    { name: "slug", type: "text", unique: true, index: true, admin: { position: "sidebar" } },
    {
      name: "countryCode",
      label: "Country",
      type: "select",
      required: true,
      options: COUNTRIES.map((c) => ({ label: c.name, value: c.code })),
    },
    {
      name: "country",
      type: "text",
      required: true,
      admin: { readOnly: true, description: "Set automatically from the Country field above." },
    },
    { name: "isAmateur", type: "checkbox", defaultValue: false },
    { name: "age", type: "number", required: true },
    { name: "turnedPro", type: "number", admin: { description: "Leave blank for amateurs." } },
    { name: "previousOpens", type: "number", required: true, defaultValue: 0 },
    {
      name: "photo",
      type: "upload",
      relationTo: "media",
      admin: {
        description:
          "Shown on the roster grid and profile page. Falls back to a placeholder when not set. Recommended: at least 1200×1200px — it's cropped to both a 3:4 portrait card and a 4:3 profile image, so keep the subject centred.",
      },
    },
    { name: "bio", type: "richText" },
  ],
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (data && !data.slug && data.name) {
          data.slug = slugify(data.name);
        }
        if (data && data.countryCode) {
          data.country = countryName(data.countryCode);
        }
        return data;
      },
    ],
  },
};
