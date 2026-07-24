import type { CollectionConfig } from "payload";

export const LeaderboardEntries: CollectionConfig = {
  slug: "leaderboard-entries",
  admin: {
    defaultColumns: ["round", "position", "player", "scoreToPar"],
  },
  access: {
    read: () => true,
  },
  fields: [
    { name: "round", type: "select", required: true, options: ["round2", "round4"] },
    { name: "position", type: "number", required: true },
    { name: "tied", type: "checkbox", defaultValue: false },
    { name: "player", type: "relationship", relationTo: "players", required: true },
    { name: "scoreToPar", type: "number", required: true },
    { name: "thru", type: "text", required: true, admin: { description: "e.g. \"F\" for finished, or a hole number." } },
    {
      name: "rounds",
      type: "array",
      labels: { singular: "Round score", plural: "Round scores" },
      fields: [{ name: "score", type: "number", required: true }],
    },
    { name: "total", type: "number", required: true },
  ],
};
