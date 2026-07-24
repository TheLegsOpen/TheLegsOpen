import type { CollectionConfig } from "payload";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const Venues: CollectionConfig = {
  slug: "venues",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "location", "timesHosted"],
  },
  access: {
    read: () => true,
  },
  fields: [
    { name: "name", type: "text", required: true },
    { name: "slug", type: "text", unique: true, index: true, admin: { position: "sidebar" } },
    { name: "location", type: "text", required: true },
    { name: "region", type: "text", required: true },
    { name: "parYardage", type: "text", required: true },
    { name: "timesHosted", type: "number", required: true },
    { name: "firstHosted", type: "number", required: true },
    { name: "lastHosted", type: "number", required: true },
    { name: "description", type: "textarea", required: true },
    {
      name: "overview",
      type: "array",
      labels: { singular: "Paragraph", plural: "Overview paragraphs" },
      fields: [{ name: "paragraph", type: "textarea", required: true }],
    },
    {
      name: "stats",
      type: "array",
      fields: [
        { name: "label", type: "text", required: true },
        { name: "value", type: "text", required: true },
      ],
    },
    { name: "imageLabel", type: "text", required: true, admin: { description: "Caption used for the placeholder course photo." } },
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
