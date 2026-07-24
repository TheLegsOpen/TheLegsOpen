import type { CollectionConfig } from "payload";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const Articles: CollectionConfig = {
  slug: "articles",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "category", "publishedAt"],
  },
  access: {
    read: () => true,
  },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "slug", type: "text", unique: true, index: true, admin: { position: "sidebar" } },
    { name: "dek", type: "textarea", required: true, admin: { description: "One-sentence standfirst shown on cards and the article header." } },
    {
      name: "category",
      type: "select",
      required: true,
      options: ["Championship News", "Player Features", "History", "Tickets", "Course Guide"],
    },
    { name: "publishedAt", type: "date", required: true, admin: { date: { pickerAppearance: "dayOnly" } } },
    { name: "readTimeMinutes", type: "number", required: true, defaultValue: 4 },
    { name: "heroLabel", type: "text", required: true, admin: { description: "Caption used for the placeholder hero photo." } },
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
  },
};
