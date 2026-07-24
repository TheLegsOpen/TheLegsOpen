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
    {
      type: "group",
      name: "nextBallot",
      label: "Next Ballot",
      admin: { description: "The next announced championship, shown on the ticket ballot pages." },
      fields: [
        { name: "number", type: "number", required: true, admin: { description: "e.g. 155" } },
        { name: "year", type: "number", required: true },
        { name: "venue", type: "relationship", relationTo: "venues", required: true },
        { name: "dates", type: "text", required: true, admin: { description: "e.g. \"15–18 July 2027\"" } },
        { name: "ballotCloses", type: "date", required: true, admin: { description: "When the public ballot closes." } },
      ],
    },
  ],
};
