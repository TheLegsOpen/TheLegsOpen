import type { GlobalConfig } from "payload";

import { revalidateSite } from "@/lib/revalidate";

const RECOMMENDED =
  "Falls back to a placeholder when not set. Recommended: wide landscape, at least 1920×1080px — it fills a full-width banner roughly 60% of the viewport height, with page text overlaid on the bottom-left, so keep the main subject centred or to the right.";

export const PageBanners: GlobalConfig = {
  slug: "page-banners",
  label: "Page Banners",
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [revalidateSite],
  },
  admin: {
    description: "Banner photo and text shown at the top of each listing page. Everything here is optional and falls back to a placeholder/default.",
  },
  fields: [
    {
      type: "collapsible",
      label: "Leaderboard",
      fields: [
        { name: "leaderboard", type: "upload", relationTo: "media", label: "Banner Image", admin: { description: RECOMMENDED } },
        { name: "leaderboardEyebrow", type: "text", label: "Eyebrow", admin: { description: "Small caption above the title, e.g. \"Championship Week\"." } },
        { name: "leaderboardTitle", type: "text", label: "Title" },
        { name: "leaderboardDescription", type: "textarea", label: "Description" },
      ],
    },
    {
      type: "collapsible",
      label: "Tee Times",
      fields: [
        { name: "teeTimes", type: "upload", relationTo: "media", label: "Banner Image", admin: { description: RECOMMENDED } },
        { name: "teeTimesEyebrow", type: "text", label: "Eyebrow" },
        { name: "teeTimesTitle", type: "text", label: "Title" },
        { name: "teeTimesDescription", type: "textarea", label: "Description" },
      ],
    },
    {
      type: "collapsible",
      label: "Venues",
      fields: [
        { name: "venues", type: "upload", relationTo: "media", label: "Banner Image", admin: { description: RECOMMENDED } },
        { name: "venuesEyebrow", type: "text", label: "Eyebrow" },
        { name: "venuesTitle", type: "text", label: "Title" },
        { name: "venuesDescription", type: "textarea", label: "Description" },
      ],
    },
    {
      type: "collapsible",
      label: "Field",
      fields: [
        { name: "field", type: "upload", relationTo: "media", label: "Banner Image", admin: { description: RECOMMENDED } },
        { name: "fieldEyebrow", type: "text", label: "Eyebrow" },
        {
          name: "fieldTitle",
          type: "text",
          label: "Title",
          admin: { description: "The description under the title always shows the live player count, so it isn't editable here." },
        },
      ],
    },
  ],
};
