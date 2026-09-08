import type { CollectionConfig } from "payload";

import { revalidateTeeTimeRounds } from "@/lib/revalidate";
import { generatePin } from "@/lib/scoring-session";

/**
 * Passes a relationship id through unconverted, correcting only its type.
 *
 * Payload's generated types declare relationship ids as `string`, but this project runs on the
 * Postgres adapter, where ids are numeric -- and Payload's own validator accepts a number and ONLY
 * a number for a numeric-id collection (see isValidID in payload/dist/utilities). So the id has to
 * reach it untouched. Stringifying one to satisfy the compiler is what broke practice rounds:
 * `String(doc.id)` turned 14 into "14" and every save of a Practice round died with "The following
 * field is invalid: Tee Time Round", reported to the admin as a plain save error on the round.
 */
const asRelationId = (id: string | number): string => id as unknown as string;

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
      name: "venue",
      label: "Course",
      type: "relationship",
      relationTo: "venues",
      admin: {
        description:
          "Which course this round is played on. For a Championship round this falls back to that championship's own venue when left blank -- set it explicitly only to backdate/override (e.g. a historical round played somewhere else). Required for a Practice round, which has no championship to infer a venue from. Also drives which handicap (Championship or Practice) is shown for this round's players on the public Tee Times page and used by the on-course scoring app.",
      },
      validate: (value: unknown, { data }: { data?: { round?: string } }) => {
        if (data?.round === "Practice" && !value) return "Required for a Practice round -- pick which course it's being played on.";
        return true;
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
      name: "regeneratePins",
      label: "Regenerate all PINs on save",
      type: "checkbox",
      defaultValue: false,
      admin: {
        position: "sidebar",
        description:
          "Tick and save to issue a fresh PIN for every group in this round. Any scorer already signed in to one of these groups is signed out immediately. Un-ticks itself once done.",
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
              "Auto-generated -- lets this group's scorer log in to the on-course scoring app. To issue fresh PINs, tick \"Regenerate all PINs on save\" in the sidebar and save.",
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

        // Clearing a group's PIN is what makes the loop below mint a new one and bump its version,
        // which is also what invalidates any scorer session already issued for that group. The
        // field itself is readOnly in the admin -- its description used to claim you could clear it
        // by hand, which was never actually possible -- so this checkbox is the way to ask for it.
        // It un-ticks itself so a later, unrelated save cannot silently re-roll every PIN.
        if (data.regeneratePins) {
          for (const group of data.groups as { pin?: string }[]) delete group.pin;
          data.regeneratePins = false;
        }

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
        const playerIds = new Set<string | number>();
        for (const group of doc.groups ?? []) {
          for (const player of group.players ?? []) {
            const playerId = typeof player === "object" ? player.id : player;
            if (playerId !== undefined && playerId !== null) playerIds.add(playerId);
          }
        }
        if (playerIds.size === 0) return doc;

        if (doc.round === "Championship" && doc.championship) {
          const championshipId = typeof doc.championship === "object" ? doc.championship.id : doc.championship;
          if (!championshipId) return doc;

          for (const playerId of playerIds) {
            const existing = await req.payload.find({
              collection: "scorecards",
              where: { and: [{ player: { equals: playerId } }, { championship: { equals: championshipId } }] },
              limit: 1,
              req,
            });
            if (existing.docs.length === 0) {
              await req.payload.create({
                collection: "scorecards",
                data: { player: asRelationId(playerId), championship: asRelationId(championshipId) },
                req,
              });
            }
          }
          return doc;
        }

        // Mirrors the Championship branch above, but keyed on this round directly instead of a
        // championship -- a practice day has neither one, and its scorecards must never trigger
        // the live-blog/stats hooks that key off `championship` being set (see Scorecards.ts).
        if (doc.round === "Practice" && doc.venue) {
          for (const playerId of playerIds) {
            const existing = await req.payload.find({
              collection: "scorecards",
              where: { and: [{ player: { equals: playerId } }, { teeTimeRound: { equals: doc.id } }] },
              limit: 1,
              req,
            });
            if (existing.docs.length === 0) {
              await req.payload.create({
                collection: "scorecards",
                // See asRelationId: doc.id goes through as-is. This is the line that was
                // String(doc.id), which failed validation and took the whole round save down with it.
                data: { player: asRelationId(playerId), teeTimeRound: asRelationId(doc.id) },
                req,
              });
            }
          }
        }

        return doc;
      },
      revalidateTeeTimeRounds,
    ],
    afterDelete: [revalidateTeeTimeRounds],
  },
};
