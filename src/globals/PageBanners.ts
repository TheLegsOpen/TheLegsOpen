import type { GlobalConfig } from "payload";

import { revalidateSite } from "@/lib/revalidate";

const RECOMMENDED =
  "Falls back to a placeholder when not set. Recommended: wide landscape, at least 1920×1080px — it fills a full-width banner roughly 60% of the viewport height, with page text overlaid on the bottom-left, so keep the main subject centred or to the right.";

/** Leaderboard, Tee Times, Statistics and Field are data-utility pages people check repeatedly, so their banner is shorter (~30vh) to get the actual content on screen faster -- matches theopen.com/AIG Women's Open's own leaderboard header proportions. */
const RECOMMENDED_COMPACT =
  "Falls back to a placeholder when not set. Recommended: wide landscape, at least 1920×640px — this banner is shorter than other pages (roughly 30% of the viewport height, so the leaderboard/schedule is visible without scrolling), with page text overlaid on the bottom-left, so keep the main subject centred or to the right.";

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
        { name: "leaderboard", type: "upload", relationTo: "media", label: "Banner Image", admin: { description: RECOMMENDED_COMPACT } },
        { name: "leaderboardEyebrow", type: "text", label: "Eyebrow", admin: { description: "Small caption above the title, e.g. \"Championship Week\"." } },
        { name: "leaderboardTitle", type: "text", label: "Title" },
        { name: "leaderboardDescription", type: "textarea", label: "Description" },
      ],
    },
    {
      type: "collapsible",
      label: "Tee Times",
      fields: [
        { name: "teeTimes", type: "upload", relationTo: "media", label: "Banner Image", admin: { description: RECOMMENDED_COMPACT } },
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
        { name: "field", type: "upload", relationTo: "media", label: "Banner Image", admin: { description: RECOMMENDED_COMPACT } },
        { name: "fieldEyebrow", type: "text", label: "Eyebrow" },
        {
          name: "fieldTitle",
          type: "text",
          label: "Title",
          admin: { description: "The description under the title always shows the live player count, so it isn't editable here." },
        },
      ],
    },
    {
      type: "collapsible",
      label: "Statistics",
      fields: [
        { name: "statistics", type: "upload", relationTo: "media", label: "Banner Image", admin: { description: RECOMMENDED_COMPACT } },
        { name: "statisticsEyebrow", type: "text", label: "Eyebrow" },
        { name: "statisticsTitle", type: "text", label: "Title" },
        { name: "statisticsDescription", type: "textarea", label: "Description" },
      ],
    },
    {
      type: "collapsible",
      label: "Records",
      fields: [
        { name: "records", type: "upload", relationTo: "media", label: "Banner Image", admin: { description: RECOMMENDED_COMPACT } },
        { name: "recordsEyebrow", type: "text", label: "Eyebrow" },
        { name: "recordsTitle", type: "text", label: "Title" },
        { name: "recordsDescription", type: "textarea", label: "Description" },
      ],
    },
    {
      type: "collapsible",
      label: "Player Profiles",
      fields: [
        {
          name: "playerProfile",
          type: "upload",
          relationTo: "media",
          label: "Banner Image",
          admin: { description: `${RECOMMENDED} Used behind the stat row and portrait at the top of every player's profile page.` },
        },
        { name: "playerProfileEyebrow", type: "text", label: "Eyebrow" },
      ],
    },
  ],
};
