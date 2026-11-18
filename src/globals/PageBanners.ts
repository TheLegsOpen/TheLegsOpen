import type { Field, GlobalConfig } from "payload";

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

/**
 * Which band of the photo shows in the strip. The banners are much wider than they are tall, so
 * most of a photo is always cropped away -- centred by default, which cut the Leaderboard photo
 * down to the bottom rows of the board. Each value maps to a CSS object-position (BANNER_FOCUS in
 * src/lib/data/page-banners.ts).
 */
function focusField(name: string): Field {
  return {
    name,
    type: "select",
    label: "Focus",
    defaultValue: "centre",
    options: [
      { label: "Top", value: "top" },
      { label: "Upper", value: "upper" },
      { label: "Centre", value: "centre" },
      { label: "Lower", value: "lower" },
      { label: "Bottom", value: "bottom" },
    ],
    admin: { description: "Which part of the photo shows in the strip, from its top edge to its bottom. Save and check the page; pick another if a face or sign is cut off." },
  };
}

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
    description: "Banner photo and text shown at the top of each listing page. What you see here is exactly what shows: an empty Eyebrow or Description shows nothing. An empty Title falls back to the page's name (every page needs a heading), and an empty image to the generated placeholder.",
  },
  fields: [
    {
      type: "collapsible",
      label: "Leaderboard",
      fields: [
        { name: "leaderboard", type: "upload", relationTo: "media", label: "Banner Image", admin: { description: RECOMMENDED_SLIM } },
        focusField("leaderboardFocus"),
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
        focusField("teeTimesFocus"),
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
        focusField("venuesFocus"),
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
        focusField("fieldFocus"),
        {
          name: "fieldGridBackground",
          type: "upload",
          relationTo: "media",
          label: "Player Grid Background",
          admin: {
            description: "Optional. A wide landscape that runs behind each row of player tiles, tinted navy and fading to solid navy at their feet, like theopen.com. A view with a horizon across the middle and open sky works best. Empty uses the banner photo above.",
          },
        },
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
        focusField("statisticsFocus"),
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
        focusField("recordsFocus"),
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
        focusField("liveBlogFocus"),
        { name: "liveBlogEyebrow", type: "text", label: "Eyebrow" },
        { name: "liveBlogTitle", type: "text", label: "Title" },
        { name: "liveBlogDescription", type: "textarea", label: "Description" },
      ],
    },
    {
      type: "collapsible",
      label: "Latest News",
      admin: { description: "Latest now has theopen.com's slim heading instead of a photo banner: the Title shows with today's date under it. The image, eyebrow and description are kept but not shown." },
      fields: [
        { name: "latest", type: "upload", relationTo: "media", label: "Banner Image (not shown)" },
        { name: "latestEyebrow", type: "text", label: "Eyebrow (not shown)" },
        { name: "latestTitle", type: "text", label: "Title", admin: { description: "e.g. \"Latest from The Legs Open\"." } },
        { name: "latestDescription", type: "textarea", label: "Description (not shown)" },
      ],
    },
    {
      type: "collapsible",
      label: "Previous Opens",
      fields: [
        { name: "previousOpens", type: "upload", relationTo: "media", label: "Banner Image", admin: { description: RECOMMENDED_COMPACT } },
        focusField("previousOpensFocus"),
        { name: "previousOpensEyebrow", type: "text", label: "Eyebrow" },
        { name: "previousOpensTitle", type: "text", label: "Title" },
        { name: "previousOpensDescription", type: "textarea", label: "Description" },
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
