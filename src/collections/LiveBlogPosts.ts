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
    components: {
      edit: {
        beforeDocumentControls: ["/components/admin/RecordNav#RecordNav"],
      },
    },
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
        { label: "Hole in one", value: "ace" },
        { label: "Albatross or better (gross)", value: "albatross" },
        { label: "Eagle (gross)", value: "eagle" },
        { label: "Nett eagle or better", value: "nett-eagle" },
        { label: "Birdie (nett)", value: "birdie" },
        { label: "Bogey (nett)", value: "bogey" },
        { label: "Double bogey or worse (nett)", value: "double-bogey" },
        { label: "Moving up", value: "moving-up" },
        { label: "Making a charge", value: "charge" },
        { label: "Hot streak (4+ in a row)", value: "hot-streak" },
        { label: "Moving down", value: "moving-down" },
        { label: "Trouble", value: "trouble" },
        { label: "Leader falters (closing holes)", value: "leader-falters" },
        { label: "Challenge falters (closing holes)", value: "challenge-falters" },
        { label: "Leader", value: "leader" },
        { label: "Tie for lead", value: "tie" },
        { label: "Lead extends", value: "lead-extends" },
        { label: "Entering contention", value: "entering-contention" },
        { label: "Leaving contention", value: "leaving-contention" },
        { label: "Pressure moment", value: "pressure-moment" },
        { label: "Through", value: "through" },
        { label: "Clubhouse leader", value: "clubhouse-leader" },
        { label: "Best gross round of the day", value: "best-gross-round" },
        { label: "In the clubhouse", value: "round-complete" },
        { label: "Playoff", value: "playoff" },
        { label: "Winner confirmed", value: "winner-confirmed" },
        { label: "No return", value: "no-return" },
        { label: "Defending champion under way", value: "defending-champion" },
        { label: "Last group out", value: "last-group" },
        { label: "Championship", value: "championship" },
        { label: "Instagram", value: "instagram" },
      ],
    },
    { name: "headline", type: "text", required: true },
    { name: "body", type: "textarea", required: true },
    {
      name: "instagramUrl",
      type: "text",
      admin: {
        description: "Only used for the Instagram category. Paste the post URL (e.g. https://www.instagram.com/p/XXXXXXXXX/) to embed it on the live blog.",
        condition: (_, siblingData) => siblingData?.category === "instagram",
      },
    },
    {
      name: "competition",
      type: "select",
      options: [
        { label: "Main", value: "main" },
        { label: "Stableford", value: "stableford" },
        { label: "Scratch", value: "scratch" },
      ],
      admin: { description: "Which competition this relates to -- set on Leader posts so the site can say which board it's about." },
    },
    { name: "championship", type: "relationship", relationTo: "championships", required: true },
    { name: "player", type: "relationship", relationTo: "players" },
    { name: "holeNumber", type: "number", admin: { description: "Which hole this post relates to, if any." } },
    {
      name: "scoreRelative",
      type: "number",
      admin: {
        description:
          "The player's live score at the time of this post -- to-par for Main/Scratch, points for Stableford (see competition). Shown as a tile on the live blog.",
      },
    },
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
