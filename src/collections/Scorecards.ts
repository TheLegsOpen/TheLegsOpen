import type { CollectionConfig } from "payload";

import { revalidateSite } from "@/lib/revalidate";
import { computeScorecardTotals } from "@/lib/scoring";
import { generateLiveBlogPosts } from "@/lib/live-blog/generate";
import { syncChampionshipStatsAfterScoreChange } from "@/lib/data/championship-stats";
import type { Venue, Player, Championship } from "@/payload-types";

export const Scorecards: CollectionConfig = {
  slug: "scorecards",
  labels: { singular: "Scorecard", plural: "Scorecards" },
  admin: {
    useAsTitle: "id",
    defaultColumns: ["player", "teeTime", "championship", "grossTotal", "nettTotal", "stablefordTotal", "holesCompleted", "noReturn", "scoreUpdatedAt"],
    description:
      "One scorecard per player per championship. Enter gross strokes hole by hole — Nett Strokeplay (Main), Stableford (Secondary) and Gross Strokeplay (Third) are all calculated automatically from this single entry. Type \"X\" instead of a number for a hole the player picked up on (no return) — that disqualifies Main and Scratch for the round (shown as NR) but Stableford keeps going, scoring 0 for that hole. Sort by Tee Time to cluster players from the same group together.",
  },
  access: {
    read: () => true,
  },
  fields: [
    { name: "player", type: "relationship", relationTo: "players", required: true },
    { name: "championship", type: "relationship", relationTo: "championships", required: true },
    {
      name: "teeTime",
      type: "text",
      admin: {
        readOnly: true,
        description: "Set automatically from the player's Championship-round tee time. Sort this column to group players by tee time.",
      },
    },
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
        {
          name: "noReturn",
          label: "No Return (X)",
          type: "checkbox",
          defaultValue: false,
          admin: {
            hidden: true,
            description: "Set via typing \"X\" in the Strokes box above — not normally edited directly.",
          },
        },
        {
          type: "row",
          fields: [
            {
              name: "fairwayHit",
              label: "Fairway Hit",
              type: "checkbox",
              admin: { width: "33%", description: "Optional -- powers Driving stats. Ignored on Par 3s." },
            },
            {
              name: "greenInRegulation",
              label: "Green in Regulation",
              type: "checkbox",
              admin: { width: "33%", description: "Optional -- powers Approach stats." },
            },
            { name: "putts", label: "Putts", type: "number", min: 0, max: 10, admin: { width: "34%", description: "Optional -- powers Putting stats." } },
          ],
        },
      ],
    },
    {
      name: "scoreUpdatedAt",
      label: "Score Last Saved",
      type: "date",
      admin: {
        readOnly: true,
        date: { pickerAppearance: "dayAndTime", displayFormat: "dd/MM/yyyy HH:mm:ss" },
        description: "Set automatically whenever this player's hole-by-hole strokes actually change — not touched by unrelated edits (e.g. tee time updates).",
      },
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
    {
      name: "noReturn",
      label: "NR (Main/Scratch)",
      type: "checkbox",
      admin: {
        readOnly: true,
        description: "Set automatically when any hole is marked \"X\" — disqualifies this card from Main and Scratch. Stableford is unaffected.",
      },
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, req, originalDoc }) => {
        if (!data) return data;

        if (Array.isArray(data.holes)) {
          data.holes = data.holes.map((hole: Record<string, unknown>, index: number) => ({ ...hole, holeNumber: index + 1 }));

          const incomingStrokes = data.holes.map((hole: { strokes?: number; noReturn?: boolean }) => `${hole.strokes ?? ""}:${hole.noReturn ?? false}`);
          const originalStrokes = (originalDoc?.holes ?? []).map(
            (hole: { strokes?: number | null; noReturn?: boolean | null }) => `${hole.strokes ?? ""}:${hole.noReturn ?? false}`,
          );
          const strokesChanged =
            incomingStrokes.length !== originalStrokes.length ||
            incomingStrokes.some((value: string, index: number) => value !== originalStrokes[index]);
          if (strokesChanged) {
            data.scoreUpdatedAt = new Date().toISOString();
          }
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

          const teeTimeRounds = await req.payload.find({
            collection: "tee-time-rounds",
            where: { and: [{ championship: { equals: championshipId } }, { round: { equals: "Championship" } }] },
            limit: 50,
            depth: 0,
          });
          let teeTime = "";
          for (const round of teeTimeRounds.docs) {
            for (const group of round.groups ?? []) {
              const inGroup = (group.players ?? []).some((p) => (typeof p === "object" ? p.id : p) == playerId);
              if (inGroup) {
                teeTime = group.time;
                break;
              }
            }
            if (teeTime) break;
          }
          data.teeTime = teeTime;
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
          const noReturn = data.holes.map((hole: { noReturn?: boolean }) => hole.noReturn ?? false);
          const totals = computeScorecardTotals(strokes, noReturn, holeInfos, player.championshipHandicap ?? 0);

          data.holesCompleted = totals.holesCompleted;
          data.grossTotal = totals.grossTotal;
          data.nettTotal = totals.nettTotal;
          data.stablefordTotal = totals.stablefordTotal;
          data.toParGross = totals.toParGross;
          data.toParNett = totals.toParNett;
          data.noReturn = totals.noReturn;
        }

        return data;
      },
    ],
    afterChange: [generateLiveBlogPosts, syncChampionshipStatsAfterScoreChange, revalidateSite],
    afterDelete: [revalidateSite],
  },
};
