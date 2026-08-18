import type { CollectionConfig } from "payload";

import { revalidateChampionships } from "@/lib/revalidate";
import { computeChampionshipAutoStats } from "@/lib/data/championship-stats";

export const Championships: CollectionConfig = {
  slug: "championships",
  admin: {
    useAsTitle: "year",
    defaultColumns: ["year", "venue", "winnerName", "margin"],
    description: "Historical winners aren't necessarily current-field players, so the winner is stored as plain text rather than a relationship — link winnerPlayer only when they happen to also be in this year's Players collection.",
    components: {
      edit: {
        beforeDocumentControls: ["/components/admin/RecordNav#RecordNav"],
      },
    },
  },
  access: {
    read: () => true,
  },
  hooks: {
    beforeValidate: [
      async ({ data, req, originalDoc }) => {
        if (!data) return data;
        if (data.completed && originalDoc?.id) {
          const stats = await computeChampionshipAutoStats(req.payload, String(originalDoc.id));
          if (stats) Object.assign(data, stats);
        }
        return data;
      },
    ],
    afterChange: [revalidateChampionships],
    afterDelete: [revalidateChampionships],
  },
  fields: [
    { name: "year", type: "number", required: true, unique: true },
    {
      name: "isActive",
      label: "Currently Being Scored",
      type: "checkbox",
      defaultValue: false,
      admin: {
        description: "Tick this for whichever championship is on today — the live leaderboard reads scores for this event.",
      },
    },
    {
      name: "completed",
      label: "Completed",
      type: "checkbox",
      defaultValue: false,
      admin: {
        position: "sidebar",
        description:
          "Tick once every player has finished and the result is final. Auto-fills (and keeps overwriting, on every save) the winner, Stableford/Scratch winners, runner-up, margin, front-9 lead, biggest lead, champion's age, and prior appearances straight from real scorecards -- the same logic Records already uses. Won On Debut is never auto-set, since a computed zero prior appearances can't be told apart from data that was just never entered.",
      },
    },
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
    {
      name: "winnerPhoto",
      label: "Champion Photo (venue page override)",
      type: "upload",
      relationTo: "media",
      admin: {
        description:
          "Optional. Shown for this champion on the venue's \"Champion Golfers at [venue]\" section instead of their usual player profile photo. Leave blank to fall back to the profile photo.",
      },
    },
    {
      name: "winningScore",
      type: "number",
      admin: { description: "The champion's Main (Nett) total for the round -- the competition that actually decides the title -- e.g. 65." },
    },
    {
      name: "scoreToPar",
      type: "number",
      admin: { description: "The champion's Main (Nett) score relative to the course's par, e.g. -4 for four under." },
    },
    { name: "margin", type: "text", admin: { description: "e.g. \"2\" (shots) or \"Playoff\"" } },
    {
      type: "collapsible",
      label: "Records — additional facts (optional, fill in as known)",
      fields: [
        {
          type: "row",
          fields: [
            { name: "stablefordWinnerName", type: "text", admin: { description: "Winner of the Stableford competition this year, if known." } },
            { name: "stablefordWinnerCountry", type: "text" },
          ],
        },
        {
          type: "row",
          fields: [
            { name: "scratchWinnerName", type: "text", admin: { description: "Winner of the Scratch competition this year, if known." } },
            { name: "scratchWinnerCountry", type: "text" },
          ],
        },
        {
          type: "row",
          fields: [
            { name: "runnerUpName", type: "text", admin: { description: "Runner-up in the Main competition, if known." } },
            { name: "runnerUpScore", type: "number", admin: { description: "Runner-up's Main (Nett) total for the round." } },
          ],
        },
        {
          type: "row",
          fields: [
            { name: "wonOnDebut", type: "checkbox", admin: { description: "Tick only if the champion won in their first-ever Legs Open appearance." } },
            { name: "priorAppearances", type: "number", admin: { description: "How many Legs Opens the champion had played before this win (0 if won on debut)." } },
            { name: "championAgeAtWin", type: "number", admin: { description: "The champion's age at the time of this win." } },
          ],
        },
        {
          type: "row",
          fields: [
            { name: "ledOutrightAfter9", type: "checkbox", admin: { description: "Tick if the eventual champion held the outright lead after 9 holes." } },
            { name: "deficitAfter9", type: "number", admin: { description: "Strokes the eventual champion trailed the leader by at the turn (for comeback records)." } },
          ],
        },
        {
          type: "row",
          fields: [
            { name: "largestLeadHolderName", type: "text", admin: { description: "Player who held the single largest lead at any point this year, if known." } },
            { name: "largestLeadMargin", type: "number", admin: { description: "Size of that lead, in strokes." } },
            { name: "largestLeadAfterHole", type: "number", admin: { description: "Which hole the lead was measured after." } },
          ],
        },
      ],
    },
  ],
};
