import type { GlobalConfig } from "payload";

import { revalidateHome } from "@/lib/revalidate";

export const NewsTicker: GlobalConfig = {
  slug: "news-ticker",
  label: "News Ticker",
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [revalidateHome],
  },
  fields: [
    {
      name: "items",
      type: "array",
      maxRows: 4,
      labels: { singular: "Ticker Item", plural: "Ticker Items" },
      admin: {
        description:
          "Up to 4 items, shown scrolling across the top of the homepage automatically on the active championship's date (set on the Championships collection) and gone again the day after -- no need to remove it yourself.",
      },
      fields: [
        { name: "headline", type: "text", required: true, admin: { description: "Keep it short -- this scrolls across a single line." } },
        { name: "url", type: "text", required: true, admin: { description: "Where the item links to, e.g. https://... or /live-blog" } },
      ],
    },
    {
      name: "forceShowForTesting",
      type: "checkbox",
      defaultValue: false,
      admin: {
        description: "Preview the ticker right now regardless of today's date. Remember to switch this back off before the championship.",
      },
    },
  ],
};
