import type { GlobalConfig } from "payload";

import { revalidateSite } from "@/lib/revalidate";

export const HomepageSettings: GlobalConfig = {
  slug: "homepage-settings",
  label: "Homepage Settings",
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [revalidateSite],
  },
  fields: [
    {
      type: "group",
      name: "currentChampion",
      label: "Current Champion (homepage hero)",
      fields: [
        { name: "championship", type: "relationship", relationTo: "championships", required: true },
        {
          name: "article",
          type: "relationship",
          relationTo: "articles",
          required: true,
          admin: { description: "Powers the \"Read the story\" link on the homepage hero." },
        },
      ],
    },
  ],
};
