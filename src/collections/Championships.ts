import type { CollectionConfig } from "payload";

import { revalidateSite } from "@/lib/revalidate";

export const Championships: CollectionConfig = {
  slug: "championships",
  admin: {
    useAsTitle: "year",
    defaultColumns: ["year", "venue", "winnerName", "margin"],
    description: "Historical winners aren't necessarily current-field players, so the winner is stored as plain text rather than a relationship — link winnerPlayer only when they happen to also be in this year's Players collection.",
    components: {
      edit: {
        beforeDocumentControls: ["/components/admin/ChampionshipYearNav#ChampionshipYearNav"],
      },
    },
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
      name: "isActive",
      label: "Currently Being Scored",
      type: "checkbox",
      defaultValue: false,
      admin: {
        description: "Tick this for whichever championship is on today — the live leaderboard reads scores for this event.",
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
      admin: { description: "The champion's actual raw strokes for the round, e.g. 74." },
    },
    {
      name: "scoreToPar",
      type: "number",
      admin: { description: "The champion's score relative to the course's par, e.g. -2 for two under. Not the raw score — see Winning Score above." },
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
            { name: "runnerUpScore", type: "number", admin: { description: "Runner-up's raw strokes for the round." } },
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
