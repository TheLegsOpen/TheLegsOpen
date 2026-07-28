import type { CollectionConfig } from "payload";

import { revalidateSite } from "@/lib/revalidate";
import { computeScorecardTotals } from "@/lib/scoring";
import type { Venue, Player, Championship } from "@/payload-types";

export const Scorecards: CollectionConfig = {
  slug: "scorecards",
  labels: { singular: "Scorecard", plural: "Scorecards" },
  admin: {
    useAsTitle: "id",
    defaultColumns: ["player", "championship", "grossTotal", "nettTotal", "stablefordTotal", "holesCompleted"],
    description:
      "One scorecard per player per championship. Enter gross strokes hole by hole — Nett Strokeplay (Main), Stableford (Secondary) and Gross Strokeplay (Third) are all calculated automatically from this single entry.",
  },
  access: {
    read: () => true,
  },
  fields: [
    { name: "player", type: "relationship", relationTo: "players", required: true },
    { name: "championship", type: "relationship", relationTo: "championships", required: true },
    {
      name: "holes",
      type: "array",
      labels: { singular: "Hole", plural: "Holes" },
      maxRows: 18,
      defaultValue: Array.from({ length: 18 }, (_, i) => ({ holeNumber: i + 1 })),
      admin: {
        description: "Hole number fills in automatically — just enter the gross strokes taken on each hole as they're played.",
        components: {
          Field: "/components/admin/ScorecardHolesField#ScorecardHolesField",
        },
      },
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "holeNumber",
              label: "Hole",
              type: "number",
              admin: { readOnly: true, width: "30%", description: "Set automatically from the row's position." },
            },
            { name: "strokes", type: "number", min: 1, max: 20, admin: { width: "70%" } },
          ],
        },
      ],
    },
    {
      type: "row",
      fields: [
        { name: "holesCompleted", label: "Thru", type: "number", admin: { readOnly: true, hidden: true, width: "16%" } },
        { name: "grossTotal", label: "Gross Total", type: "number", admin: { readOnly: true, hidden: true, width: "16%" } },
        { name: "nettTotal", label: "Nett Total", type: "number", admin: { readOnly: true, hidden: true, width: "16%" } },
        { name: "stablefordTotal", label: "Stableford Points", type: "number", admin: { readOnly: true, hidden: true, width: "16%" } },
        { name: "toParGross", label: "Gross To Par", type: "number", admin: { readOnly: true, hidden: true, width: "16%" } },
        { name: "toParNett", label: "Nett To Par", type: "number", admin: { readOnly: true, hidden: true, width: "16%" } },
      ],
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, req, originalDoc }) => {
        if (!data) return data;

        if (Array.isArray(data.holes)) {
          data.holes = data.holes.map((hole: Record<string, unknown>, index: number) => ({ ...hole, holeNumber: index + 1 }));
        }

        const playerId = typeof data.player === "object" ? (data.player as { id?: string })?.id : data.player;
        const championshipId =
          typeof data.championship === "object" ? (data.championship as { id?: string })?.id : data.championship;

        if (playerId && championshipId) {
          const existing = await req.payload.find({
            collection: "scorecards",
            where: { and: [{ player: { equals: playerId } }, { championship: { equals: championshipId } }] },
            limit: 2,
          });
          const conflict = existing.docs.find((doc) => doc.id !== originalDoc?.id);
          if (conflict) {
            throw new Error("This player already has a scorecard for this championship.");
          }
        }

        if (playerId && championshipId && Array.isArray(data.holes)) {
          const player = (await req.payload.findByID({ collection: "players", id: playerId })) as Player;
          const championship = (await req.payload.findByID({
            collection: "championships",
            id: championshipId,
          })) as Championship;
          const venueId = typeof championship.venue === "object" ? championship.venue?.id : championship.venue;
          const venue = venueId ? ((await req.payload.findByID({ collection: "venues", id: venueId })) as Venue) : null;
          const venueHoles = venue?.holes ?? [];

          const holeInfos = data.holes.map((_: unknown, index: number) => ({
            par: venueHoles[index]?.par ?? 4,
            si: venueHoles[index]?.si ?? index + 1,
          }));
          const strokes = data.holes.map((hole: { strokes?: number }) => hole.strokes ?? null);
          const totals = computeScorecardTotals(strokes, holeInfos, player.championshipHandicap ?? 0);

          data.holesCompleted = totals.holesCompleted;
          data.grossTotal = totals.grossTotal;
          data.nettTotal = totals.nettTotal;
          data.stablefordTotal = totals.stablefordTotal;
          data.toParGross = totals.toParGross;
          data.toParNett = totals.toParNett;
        }

        return data;
      },
    ],
    afterChange: [revalidateSite],
    afterDelete: [revalidateSite],
  },
};
