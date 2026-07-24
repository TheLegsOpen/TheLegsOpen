import type { CollectionConfig } from "payload";

export const PlayerStatistics: CollectionConfig = {
  slug: "player-statistics",
  admin: {
    defaultColumns: ["player", "drivingDistanceYards", "greensInRegulationHit", "totalPutts"],
  },
  access: {
    read: () => true,
  },
  fields: [
    { name: "player", type: "relationship", relationTo: "players", required: true, unique: true },
    { name: "drivingDistanceYards", type: "number", required: true, admin: { description: "Average driving distance in yards, e.g. 329.3" } },
    { name: "greensInRegulationHit", type: "number", required: true, min: 0, max: 72, admin: { description: "Greens hit in regulation, out of 72 holes played" } },
    { name: "totalPutts", type: "number", required: true },
    { name: "par5ScoringToPar", type: "number", required: true, admin: { description: "Cumulative par-5 scoring relative to par, e.g. -8" } },
    { name: "scramblingPercent", type: "number", required: true, min: 0, max: 100 },
  ],
};
