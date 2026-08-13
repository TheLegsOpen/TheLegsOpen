import type { GlobalConfig } from "payload";

import { revalidateSite } from "@/lib/revalidate";

function validateHex(value: string | null | undefined) {
  if (!value) return "Required";
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim()) || "Enter a hex color, e.g. #06051E";
}

export const SiteTheme: GlobalConfig = {
  slug: "site-theme",
  label: "Site Theme",
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [revalidateSite],
  },
  fields: [
    {
      type: "group",
      name: "colors",
      label: "Colors",
      fields: [
        {
          name: "primaryColor",
          type: "text",
          defaultValue: "#06051E",
          validate: validateHex,
          admin: { description: "Hex color, e.g. #06051E. Header/footer background and primary buttons." },
        },
        {
          name: "accentColor",
          type: "text",
          defaultValue: "#FFB800",
          validate: validateHex,
          admin: { description: "Hex color, e.g. #FFB800. CTAs, highlights and the leaderboard leader row." },
        },
      ],
    },
    {
      type: "group",
      name: "branding",
      label: "Logo & Favicon",
      fields: [
        {
          name: "logo",
          type: "upload",
          relationTo: "media",
          admin: { description: "Optional. Replaces the \"LO\" monogram in the header/footer when set." },
        },
        {
          name: "favicon",
          type: "upload",
          relationTo: "media",
          admin: { description: "Optional. Replaces the browser tab icon when set. A square image works best." },
        },
        {
          type: "row",
          fields: [
            {
              name: "championBadge",
              type: "upload",
              relationTo: "media",
              label: "Champion Badge",
              admin: {
                width: "50%",
                description:
                  "Shown next to the year(s) won on a champion's Field card and profile page. Falls back to a trophy icon when not set. Recommended: square, transparent background, at least 200×200px.",
              },
            },
            {
              name: "championWinnerBadge",
              type: "upload",
              relationTo: "media",
              label: "Championship Winner Badge",
              admin: {
                width: "50%",
                description:
                  "Shown on the homepage leaderboard widget, next to the Champion Badge above, once the championship is decided. Falls back to showing nothing (not the trophy icon) when unset. Recommended: square, transparent background, at least 200×200px.",
              },
            },
          ],
        },
        {
          name: "championTrophyGraphic",
          type: "upload",
          relationTo: "media",
          label: "Champion Trophy Graphic",
          admin: {
            description:
              "Large decorative trophy graphic shown on the right side of the hero on a champion's profile page, next to their Champion Golfer of the Year years -- matches theopen.com's Claret Jug treatment. Not shown at all when not set, or for players who haven't won. Recommended: tall image with a black/dark background so it blends into the hero without a visible edge.",
          },
        },
      ],
    },
    {
      name: "fontPreset",
      type: "select",
      defaultValue: "fraunces-inter",
      options: [
        { label: "Cardinal + Founders Grotesk (default)", value: "fraunces-inter" },
        { label: "Playfair Display + Source Sans 3", value: "playfair-source-sans" },
        { label: "Newsreader + Manrope", value: "newsreader-manrope" },
      ],
      admin: { description: "Display (headline) + body font pairing for the whole site." },
    },
    {
      name: "showBreadcrumbs",
      type: "checkbox",
      defaultValue: true,
      admin: { description: "Show the Home / Page trail near the top of every page. Turn off to hide breadcrumbs site-wide." },
    },
  ],
};
