import type { CollectionConfig } from "payload";

import { revalidateSite } from "@/lib/revalidate";

export const LiveBlogPosts: CollectionConfig = {
  slug: "live-blog-posts",
  labels: { singular: "Live Blog Post", plural: "Live Blog Posts" },
  admin: {
    useAsTitle: "headline",
    defaultColumns: ["headline", "category", "player", "championship", "postedAt"],
    description:
      "Auto-generated whenever a notable score is saved (birdie or better, bogey or worse, a new outright leader, or a finished round). You can also add posts by hand for anything the generator won't catch.",
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: "category",
      type: "select",
      required: true,
      options: [
        { label: "Eagle or better", value: "eagle" },
        { label: "Birdie", value: "birdie" },
        { label: "Bogey or worse", value: "bogey" },
        { label: "Leader", value: "leader" },
        { label: "Round complete", value: "round-complete" },
        { label: "Championship", value: "championship" },
      ],
    },
    { name: "headline", type: "text", required: true },
    { name: "body", type: "textarea", required: true },
    { name: "championship", type: "relationship", relationTo: "championships", required: true },
    { name: "player", type: "relationship", relationTo: "players" },
    { name: "holeNumber", type: "number", admin: { description: "Which hole this post relates to, if any." } },
    {
      name: "postedAt",
      type: "date",
      required: true,
      defaultValue: () => new Date().toISOString(),
      admin: { date: { pickerAppearance: "dayAndTime", displayFormat: "dd/MM/yyyy HH:mm:ss" } },
    },
  ],
  hooks: {
    afterChange: [revalidateSite],
    afterDelete: [revalidateSite],
  },
};
