import type { CollectionConfig } from "payload";

export const TeeTimeRounds: CollectionConfig = {
  slug: "tee-time-rounds",
  admin: {
    defaultColumns: ["round", "day", "date", "archived"],
  },
  access: {
    read: () => true,
  },
  fields: [
    { name: "round", type: "select", required: true, options: ["Practice", "Championship"] },
    { name: "day", type: "text", required: true, admin: { description: "e.g. \"Thursday\"" } },
    { name: "date", type: "text", required: true, admin: { description: "e.g. \"16 July 2026\"" } },
    {
      name: "archived",
      type: "checkbox",
      defaultValue: false,
      admin: {
        description: "Hides these tee times from the live site while keeping the record for reference when building future tee groups.",
      },
    },
    {
      name: "groups",
      type: "array",
      labels: { singular: "Group", plural: "Groups" },
      fields: [
        { name: "time", type: "text", required: true, admin: { description: "e.g. \"08:12\"" } },
        { name: "tee", type: "select", required: true, options: ["1st", "10th"] },
        { name: "players", type: "relationship", relationTo: "players", hasMany: true, required: true },
      ],
    },
  ],
};
