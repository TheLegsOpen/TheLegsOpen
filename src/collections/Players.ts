import type { CollectionConfig } from "payload";

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
    { name: "country", type: "text", required: true },
    { name: "countryCode", type: "text", required: true },
    { name: "isAmateur", type: "checkbox", defaultValue: false },
    { name: "age", type: "number", required: true },
    { name: "turnedPro", type: "number", admin: { description: "Leave blank for amateurs." } },
    { name: "previousOpens", type: "number", required: true, defaultValue: 0 },
    { name: "bio", type: "richText" },
  ],
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (data && !data.slug && data.name) {
          data.slug = slugify(data.name);
        }
        return data;
      },
    ],
  },
};
