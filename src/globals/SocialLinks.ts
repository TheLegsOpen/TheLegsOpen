import type { GlobalConfig } from "payload";

import { revalidateSite } from "@/lib/revalidate";

export const SocialLinks: GlobalConfig = {
  slug: "social-links",
  label: "Social Media",
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [revalidateSite],
  },
  admin: {
    description:
      "Icons shown in the footer's social row. Each platform needs both an icon and a URL to appear on the site — leave either blank to hide it.",
  },
  fields: [
    {
      name: "links",
      type: "array",
      labels: { singular: "Platform", plural: "Platforms" },
      admin: {
        description: "Add one entry per platform you want to show, in display order.",
      },
      fields: [
        {
          name: "platform",
          type: "select",
          required: true,
          options: ["Facebook", "Instagram", "LinkedIn", "X", "YouTube", "TikTok", "Other"],
          admin: { description: "Used as the accessible label for the icon link." },
        },
        {
          name: "label",
          type: "text",
          admin: {
            description: 'Only needed when Platform is "Other" — the name read out by screen readers.',
            condition: (_, siblingData) => siblingData?.platform === "Other",
          },
        },
        {
          name: "icon",
          type: "upload",
          relationTo: "media",
          admin: {
            description: "Small square icon, recommended 64×64px, transparent background.",
          },
        },
        {
          name: "url",
          type: "text",
          admin: {
            description: "Full profile URL, e.g. https://instagram.com/yourpage.",
          },
        },
      ],
    },
  ],
};
