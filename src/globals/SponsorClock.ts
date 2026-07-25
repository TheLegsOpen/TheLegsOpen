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
        { name: "tagline", type: "text", defaultValue: "Official Timekeeper", required: true },
        {
          name: "logo",
          type: "upload",
          relationTo: "media",
          admin: { description: "Optional. Shown next to the sponsor name instead of relying on text alone." },
        },
        {
          name: "faceColor",
          type: "text",
          defaultValue: "#0E3D2C",
          validate: validateHex,
          admin: { description: "Hex color, e.g. #0E3D2C. The widget's background." },
        },
      ],
    },
    {
      type: "group",
      name: "graphics",
      label: "Clock Hand Graphics",
      admin: {
        description:
          "All optional — each hand falls back to the default drawn clock face when not set. Upload a tall, narrow image with the pivot point at the bottom-center (it's rotated around that point).",
      },
      fields: [
        {
          name: "faceImage",
          type: "upload",
          relationTo: "media",
          admin: { description: "The clock dial/face artwork, shown behind the hands. Falls back to a plain drawn face when not set." },
        },
        {
          name: "faceImageRetina",
          type: "upload",
          relationTo: "media",
          admin: { description: "Optional 2x version of the face artwork for sharper rendering on high-density (retina) screens." },
        },
        { name: "hourHand", type: "upload", relationTo: "media" },
        { name: "minuteHand", type: "upload", relationTo: "media" },
        { name: "secondHand", type: "upload", relationTo: "media" },
        { name: "centerCap", type: "upload", relationTo: "media", admin: { description: "Small image covering the pivot point." } },
      ],
    },
  ],
};
