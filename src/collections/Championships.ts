import type { CollectionConfig } from "payload";

import { revalidateSite } from "@/lib/revalidate";

export const Championships: CollectionConfig = {
  slug: "championships",
  admin: {
    useAsTitle: "year",
    defaultColumns: ["year", "venue", "winnerName", "margin"],
    description: "Historical winners aren't necessarily current-field players, so the winner is stored as plain text rather than a relationship — link winnerPlayer only when they happen to also be in this year's Players collection.",
  },
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [revalidateSite],
    afterDelete: [revalidateSite],
  },
  fields: [
    { name: "year", type: "number", required: true, unique: true },
    {
      name: "date",
      label: "Championship Date",
      type: "date",
      admin: {
        date: { pickerAppearance: "dayOnly", displayFormat: "dd/MM/yyyy" },
        description: "The final round date (or scheduled date for an upcoming championship). UK format (DD/MM/YYYY).",
      },
    },
    { name: "venue", type: "relationship", relationTo: "venues", required: true },
    {
      name: "winnerName",
      type: "text",
      admin: { description: "Leave blank for a championship that hasn't been played yet." },
    },
    { name: "winnerCountry", type: "text" },
    {
      name: "winnerPlayer",
      type: "relationship",
      relationTo: "players",
      admin: { description: "Optional — only set if this winner is also in the current Players collection." },
    },
    { name: "scoreToPar", type: "number" },
    { name: "margin", type: "text", admin: { description: "e.g. \"2 shots\" or \"Playoff\"" } },
  ],
};
