import type { GlobalConfig } from "payload";

import { revalidateSite } from "@/lib/revalidate";

function validateHex(value: string | null | undefined) {
  if (!value) return "Required";
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim()) || "Enter a hex color, e.g. #0E3D2C";
}

export const SponsorClock: GlobalConfig = {
  slug: "sponsor-clock",
  label: "Sponsor Clock Widget",
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [revalidateSite],
  },
  fields: [
    {
      type: "group",
      name: "sponsor",
      label: "Sponsor",
      fields: [
        { name: "name", type: "text", defaultValue: "Meridian", required: true },
        {
          name: "tagline",
          type: "text",
          admin: { description: "Optional small caption under the sponsor name, e.g. \"Official Timekeeper\". Leave blank to hide it." },
        },
        {
          name: "logo",
          type: "upload",
          relationTo: "media",
          admin: {
            description:
              "Optional. Shown next to the sponsor name instead of relying on text alone. Recommended: transparent PNG or SVG, roughly 400×100px landscape wordmark.",
          },
        },
        {
          name: "faceColor",
          type: "text",
          defaultValue: "#0E3D2C",
          validate: validateHex,
          admin: { description: "Hex color, e.g. #0E3D2C. The widget's background." },
        },
        {
          name: "clockFont",
          type: "select",
          defaultValue: "display",
          options: [
            { label: "Site display font", value: "display" },
            { label: "Timekeeper", value: "timekeeper" },
          ],
          admin: {
            description: "Font used for the course name/\"Your time\" labels and the time values themselves.",
          },
        },
      ],
    },
    {
      type: "group",
      name: "graphics",
      label: "Clock Face & Hand Graphics",
      admin: {
        description: "All optional — anything left unset falls back to the default drawn clock face.",
      },
      fields: [
        {
          name: "faceImage",
          type: "upload",
          relationTo: "media",
          admin: {
            description:
              "The clock dial/face artwork, shown behind the hands. Falls back to a plain drawn face when not set. Recommended: square, at least 300×300px.",
          },
        },
        {
          name: "faceImageRetina",
          type: "upload",
          relationTo: "media",
          admin: {
            description:
              "Optional 2x version of the face artwork for sharper rendering on high-density (retina) screens. Recommended: square, double the base image's dimensions (e.g. 600×600px if the base is 300×300px).",
          },
        },
        {
          name: "hourHand",
          type: "upload",
          relationTo: "media",
          admin: { description: "Recommended: tall and narrow, e.g. 40×260px, pointing straight up with the pivot at the bottom edge." },
        },
        {
          name: "minuteHand",
          type: "upload",
          relationTo: "media",
          admin: { description: "Recommended: tall and narrow, e.g. 30×320px, pointing straight up with the pivot at the bottom edge." },
        },
        {
          name: "secondHand",
          type: "upload",
          relationTo: "media",
          admin: { description: "Recommended: tall and narrow, e.g. 16×340px, pointing straight up with the pivot at the bottom edge." },
        },
        {
          name: "centerCap",
          type: "upload",
          relationTo: "media",
          admin: { description: "Small image covering the pivot point. Recommended: square, around 64×64px." },
        },
      ],
    },
  ],
};
