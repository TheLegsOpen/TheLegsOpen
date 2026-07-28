import type { CollectionConfig } from "payload";

export const TeeTimeRounds: CollectionConfig = {
  slug: "tee-time-rounds",
  admin: {
    defaultColumns: ["round", "day", "date", "championship", "archived"],
  },
  access: {
    read: () => true,
  },
  fields: [
    { name: "round", type: "select", required: true, options: ["Practice", "Championship"] },
    {
      name: "championship",
      type: "relationship",
      relationTo: "championships",
      admin: {
        description:
          "Which championship this round belongs to. For a Championship round, saving with players in the groups automatically creates a blank Scorecard for each player, ready for scores to be entered.",
      },
    },
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
        {
          name: "players",
          type: "relationship",
          relationTo: "players",
          hasMany: true,
          required: true,
          filterOptions: () => ({ inField: { equals: true } }),
        },
      ],
    },
  ],
  hooks: {
    afterChange: [
      async ({ doc, req }) => {
        if (doc.round !== "Championship" || !doc.championship) return doc;
        const championshipId = typeof doc.championship === "object" ? doc.championship.id : doc.championship;
        if (!championshipId) return doc;

        const playerIds = new Set<string | number>();
        for (const group of doc.groups ?? []) {
          for (const player of group.players ?? []) {
            const playerId = typeof player === "object" ? player.id : player;
            if (playerId !== undefined && playerId !== null) playerIds.add(playerId);
          }
        }

        for (const playerId of playerIds) {
          const existing = await req.payload.find({
            collection: "scorecards",
            where: { and: [{ player: { equals: playerId } }, { championship: { equals: championshipId } }] },
            limit: 1,
          });
          if (existing.docs.length === 0) {
            await req.payload.create({
              collection: "scorecards",
              data: { player: playerId as string, championship: championshipId as string },
            });
          }
        }

        return doc;
      },
    ],
  },
};
