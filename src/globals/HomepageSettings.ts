import type { GlobalConfig } from "payload";

import { revalidateSite } from "@/lib/revalidate";

const TONE_OPTIONS = [
  { label: "Navy", value: "navy" },
  { label: "Gold", value: "gold" },
  { label: "Dusk", value: "dusk" },
  { label: "Slate", value: "slate" },
];

export const HomepageSettings: GlobalConfig = {
  slug: "homepage-settings",
  label: "Homepage Settings",
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [revalidateSite],
  },
  fields: [
    {
      type: "group",
      name: "currentChampion",
      label: "Current Champion (homepage hero)",
      fields: [
        { name: "championship", type: "relationship", relationTo: "championships", required: true },
        {
          name: "article",
          type: "relationship",
          relationTo: "articles",
          required: true,
          admin: { description: "The article the primary button below links to." },
        },
        {
          name: "primaryButtonLabel",
          type: "text",
          defaultValue: "Read the story",
          admin: { description: "Label for the button linking to the article above." },
        },
        {
          name: "secondaryButtonLabel",
          type: "text",
          defaultValue: "View full leaderboard",
          admin: { description: "Label for the second button, which always links to /leaderboard." },
        },
      ],
    },
    {
      name: "sections",
      type: "blocks",
      label: "Homepage Sections",
      admin: {
        description:
          "Add, remove and reorder the sections shown between the leaderboard widget and the product carousel. Each section below is a self-contained block you can configure independently.",
      },
      blocks: [
        {
          slug: "infoCardGroup",
          labels: { singular: "Info Card Group", plural: "Info Card Groups" },
          fields: [
            { name: "eyebrow", type: "text", defaultValue: "Key Information" },
            { name: "heading", type: "text", required: true, defaultValue: "What you need to know" },
            {
              name: "cards",
              type: "array",
              minRows: 1,
              maxRows: 4,
              labels: { singular: "Card", plural: "Cards" },
              fields: [
                {
                  name: "image",
                  type: "upload",
                  relationTo: "media",
                  admin: { description: "Falls back to a placeholder when not set. Recommended: landscape, at least 1200×675px (16:9)." },
                },
                { name: "tone", type: "select", options: TONE_OPTIONS, defaultValue: "navy", admin: { description: "Placeholder colour used when no image is set." } },
                { name: "title", type: "text", required: true },
                { name: "description", type: "textarea" },
                { name: "linkLabel", type: "text", defaultValue: "Read more" },
                { name: "linkHref", type: "text", required: true, admin: { description: "e.g. /venues" } },
              ],
            },
          ],
        },
        {
          slug: "ctaBanner",
          labels: { singular: "CTA Banner", plural: "CTA Banners" },
          fields: [
            { name: "eyebrow", type: "text" },
            { name: "heading", type: "text", required: true },
            { name: "description", type: "textarea" },
            { name: "buttonLabel", type: "text", required: true },
            { name: "buttonHref", type: "text", required: true },
            {
              name: "tone",
              type: "select",
              options: [
                { label: "Light", value: "light" },
                { label: "Dark", value: "dark" },
                { label: "Gold", value: "gold" },
              ],
              defaultValue: "dark",
            },
          ],
        },
        {
          slug: "richText",
          labels: { singular: "Text Block", plural: "Text Blocks" },
          fields: [
            { name: "heading", type: "text" },
            { name: "content", type: "richText", required: true },
          ],
        },
      ],
    },
  ],
};
