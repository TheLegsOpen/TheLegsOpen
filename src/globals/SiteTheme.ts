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
      ],
    },
    {
      name: "fontPreset",
      type: "select",
      defaultValue: "fraunces-inter",
      options: [
        { label: "Fraunces + Inter (default)", value: "fraunces-inter" },
        { label: "Playfair Display + Source Sans 3", value: "playfair-source-sans" },
        { label: "Newsreader + Manrope", value: "newsreader-manrope" },
      ],
      admin: { description: "Display (headline) + body font pairing for the whole site." },
    },
  ],
};
