import type { GlobalConfig } from "payload";

import { revalidateMainMenu } from "@/lib/revalidate";

const link = [
  { name: "label", type: "text", required: true },
  {
    name: "href",
    type: "text",
    required: true,
    label: "Link",
    admin: { description: "A page on this site, e.g. /leaderboard, or a full address starting https:// for another site." },
  },
] as const;

/**
 * The header's top-bar links and the slide-out (hamburger) panel, editable in the admin. Until this
 * global is first saved, src/lib/data/main-menu.ts falls back to the menu that was written in
 * src/data/navigation.ts, so the site never loses its menu.
 */
export const MainMenu: GlobalConfig = {
  slug: "main-menu",
  label: "Main Menu",
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [revalidateMainMenu],
  },
  admin: {
    description:
      "The links across the top of every page, and the menu that slides out from the ☰ button. Drag rows to reorder them.",
  },
  fields: [
    {
      name: "topLinks",
      type: "array",
      label: "Top bar links",
      labels: { singular: "Link", plural: "Links" },
      admin: { description: "Shown across the header on laptops and larger (three fit comfortably)." },
      fields: [...link],
    },
    {
      name: "groups",
      type: "array",
      label: "Menu panel groups",
      labels: { singular: "Group", plural: "Groups" },
      admin: { description: "The slide-out menu, in groups separated by a line. Each group can have an optional heading." },
      fields: [
        { name: "heading", type: "text", admin: { description: "Optional, e.g. \"Venues\"." } },
        {
          name: "emphasis",
          type: "checkbox",
          label: "Large links",
          defaultValue: false,
          admin: { description: "Show this group's links in the panel's large type, as the main links are." },
        },
        { name: "links", type: "array", labels: { singular: "Link", plural: "Links" }, fields: [...link] },
      ],
    },
    {
      name: "showVenueLinks",
      type: "checkbox",
      label: "Add a Venues group automatically",
      defaultValue: true,
      admin: { description: "A group listing every championship venue, kept up to date from the Championships, placed after the first group." },
    },
  ],
};
