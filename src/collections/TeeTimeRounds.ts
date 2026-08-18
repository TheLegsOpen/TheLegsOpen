import type { CollectionConfig } from "payload";

import { revalidateTeeTimeRounds } from "@/lib/revalidate";
import { generatePin } from "@/lib/scoring-session";

export const TeeTimeRounds: CollectionConfig = {
  slug: "tee-time-rounds",
  admin: {
    defaultColumns: ["round", "date", "championship", "archived"],
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
    {
      name: "date",
      type: "date",
      required: true,
      admin: {
        date: { pickerAppearance: "dayOnly", displayFormat: "dd/MM/yyyy" },
        description: "UK format (DD/MM/YYYY). The weekday shown on the site is derived from this automatically.",
      },
    },
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
          // filterOptions narrows the admin picker to this season's field ("In Current Field" on
          // Players) -- deliberately paired with a custom validate so it stays picker-only. Payload's
          // default relationship validator re-checks filterOptions on every save, not just when a
          // value is newly picked, so without this, saving ANY old round after removing a
          // now-retired/moved-on player from the current field (e.g. wrapping up one year's
          // Championship rounds before setting up the next) fails with "invalid selections" on
          // players who were perfectly valid when that round actually happened.
          filterOptions: () => ({ inField: { equals: true } }),
          validate: (value: unknown) => {
            if (!Array.isArray(value) || value.length === 0) return "This field is required.";
            return true;
          },
        },
        {
          name: "pin",
          type: "text",
          admin: {
            description:
              "Auto-generated -- lets this group's scorer log in to the on-course scoring app. To reset it, clear this field and save.",
            readOnly: true,
          },
        },
        {
          name: "pinVersion",
          type: "number",
          defaultValue: 1,
          admin: { hidden: true },
        },
      ],
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, req, originalDoc }) => {
        if (!data || !Array.isArray(data.groups)) return data;

        const existingRounds = await req.payload.find({
          collection: "tee-time-rounds",
          where: { archived: { not_equals: true } },
          limit: 200,
          depth: 0,
          req,
        });
        const takenPins = new Set<string>();
        for (const round of existingRounds.docs) {
          if (String(round.id) === String(originalDoc?.id)) continue;
          for (const group of round.groups ?? []) {
            if (group.pin) takenPins.add(group.pin);
          }
        }

        type OriginalGroup = { id?: string | null; pin?: string | null; pinVersion?: number | null };
        const originalById = new Map<string | null | undefined, OriginalGroup>(
          ((originalDoc?.groups ?? []) as OriginalGroup[]).map((g) => [g.id, g]),
        );

        for (const group of data.groups as { id?: string; pin?: string; pinVersion?: number }[]) {
          const original = group.id ? originalById.get(group.id) : undefined;

          if (!group.pin) {
            let candidate = generatePin();
            while (takenPins.has(candidate)) candidate = generatePin();
            takenPins.add(candidate);
            group.pin = candidate;
            group.pinVersion = (original?.pinVersion ?? 0) + 1;
          } else if (original && group.pin !== original.pin) {
            // Admin hand-edited the PIN -- keep it (still needs to be unique against everyone
            // else's, but not against its own previous value) and bump the version so any
            // already-issued scorer session for this group stops working immediately.
            takenPins.add(group.pin);
            group.pinVersion = (original.pinVersion ?? 1) + 1;
          } else if (!group.pinVersion) {
            group.pinVersion = 1;
          }
        }

        return data;
      },
    ],
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
      revalidateTeeTimeRounds,
    ],
    afterDelete: [revalidateTeeTimeRounds],
  },
};
