import type { GlobalConfig } from "payload";

import { revalidatePageBanners } from "@/lib/revalidate";

/**
 * Every page banner is now a short full-width strip (PageHero's "slim" and "compact" sizes, and
 * the Venues page's fixed height), so the same advice fits them all: a wide photo whose subject
 * sits in a band across the middle, because wide screens crop the top and bottom and phones crop
 * the sides. Each constant adds its own page's height.
 */
const BANNER =
  "Optional — a placeholder shows until one is set. Upload a wide landscape photo, at least 1920×640px (larger is fine). It fills the full width of the screen as a short strip, so the top and bottom are cropped on wide screens and the sides on phones: keep the subject in a band across the middle. The page title sits over the bottom-left.";
const RECOMMENDED = `${BANNER} About 300px tall on a laptop.`;
const RECOMMENDED_COMPACT = `${BANNER} About 300px tall on a laptop.`;
const RECOMMENDED_SLIM = `${BANNER} The slimmest banner on the site, about 230px tall, with the championship-week switcher along its bottom edge.`;

export const PageBanners: GlobalConfig = {
  slug: "page-banners",
  label: "Page Banners",
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [revalidatePageBanners],
  },
  admin: {
    description: "Banner photo and text shown at the top of each listing page. Everything here is optional and falls back to a placeholder/default.",
  },
  fields: [
    {
      type: "collapsible",
      label: "Leaderboard",
      fields: [
        { name: "leaderboard", type: "upload", relationTo: "media", label: "Banner Image", admin: { description: RECOMMENDED_SLIM } },
        { name: "leaderboardEyebrow", type: "text", label: "Eyebrow", admin: { description: "Small caption above the title, e.g. \"Championship Week\"." } },
        { name: "leaderboardTitle", type: "text", label: "Title" },
        { name: "leaderboardDescription", type: "textarea", label: "Description" },
      ],
    },
    {
      type: "collapsible",
      label: "Tee Times",
      fields: [
        { name: "teeTimes", type: "upload", relationTo: "media", label: "Banner Image", admin: { description: RECOMMENDED_SLIM } },
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
        { name: "statistics", type: "upload", relationTo: "media", label: "Banner Image", admin: { description: RECOMMENDED_SLIM } },
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
      label: "Live Blog",
      fields: [
        { name: "liveBlog", type: "upload", relationTo: "media", label: "Banner Image", admin: { description: RECOMMENDED_COMPACT } },
        { name: "liveBlogEyebrow", type: "text", label: "Eyebrow" },
        { name: "liveBlogTitle", type: "text", label: "Title" },
        { name: "liveBlogDescription", type: "textarea", label: "Description" },
      ],
    },
    {
      type: "collapsible",
      label: "Latest News",
      fields: [
        { name: "latest", type: "upload", relationTo: "media", label: "Banner Image", admin: { description: RECOMMENDED } },
        { name: "latestEyebrow", type: "text", label: "Eyebrow" },
        { name: "latestTitle", type: "text", label: "Title" },
        { name: "latestDescription", type: "textarea", label: "Description" },
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
          admin: { description: "Not currently shown on the site — player pages use a plain navy banner. Kept so a photo can be brought back later without losing this setting." },
        },
        { name: "playerProfileEyebrow", type: "text", label: "Eyebrow" },
      ],
    },
  ],
};
