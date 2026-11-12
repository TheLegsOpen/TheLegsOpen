import type { CollectionConfig } from "payload";

import { revalidateChampionships } from "@/lib/revalidate";
import { computeChampionshipAutoStats } from "@/lib/data/championship-stats";
import { syncVenueHostingAfterChange, syncVenueHostingAfterDelete } from "@/lib/data/venue-hosting";

export const Championships: CollectionConfig = {
  slug: "championships",
  // Relationship-picker dropdowns elsewhere (e.g. Tee Time Rounds' championship field) page
  // through options 10 at a time sorted by this -- unset, that defaults to id ascending, so a
  // newly created championship (highest id) needs several pages of scrolling before it's even
  // reachable, and the compact dropdown's own lazy-load didn't reliably get there in practice
  // (confirmed: 2026/2027 never surfaced, even when searching "202" which should have matched
  // them too). Newest-first means a just-created year is immediately visible at the top instead.
  defaultSort: "-year",
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
    // syncVenueHosting first: it writes the venue's hosting counts, and revalidateChampionships
    // busts /venues/[slug] -- so the counts need to be right before the cache is rebuilt.
    afterChange: [syncVenueHostingAfterChange, revalidateChampionships],
    afterDelete: [syncVenueHostingAfterDelete, revalidateChampionships],
  },
  fields: [
    { name: "year", type: "number", required: true, unique: true },
    {
      name: "isActive",
      label: "Currently Being Scored",
      type: "checkbox",
      defaultValue: false,
      admin: {
        description:
          "Tick this for whichever championship is on today — the live leaderboard reads scores for this event, and only a ticked championship generates live blog commentary. Between championships you can leave it ticked on the last one played, or untick it entirely: either way the homepage leaderboard, live blog, weather and sponsor clock show the most recently played championship. It no longer affects which courses appear under Venues in the menu — that follows the Championship Date.",
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
      label: "Champion Photo",
      type: "upload",
      relationTo: "media",
      admin: {
        description:
          "Optional. The champion with the trophy, ideally landscape, at least 1920×1080px, with the champion in the centre. Used as the banner on this year's Previous Opens page when it is landscape and at least 1200px wide (otherwise the banner uses the venue's course photo); set the image's Banner focus on the champion's face (open the image in Media and click their face) and the banner keeps it in shot at every screen width; in the winner panel on the Main leaderboard (nothing shows there when this is blank); on the champion's card in \"Champion Golfers at [venue]\" (a tall 400×600 crop from the centre); and in the venue strip below unless that has a photo of its own. The venue page falls back to the player's profile photo when this is blank.",
      },
    },
    {
      // Needs the champion_cutout_id column on championships, added by hand in Supabase before
      // this shipped -- there are no migrations here and the adapter only pushes schema in
      // development.
      name: "championCutout",
      label: "Champion Cut-out (leaderboard)",
      type: "upload",
      relationTo: "media",
      admin: {
        description:
          "Optional. The champion with the trophy, background removed: a transparent PNG or WebP, at least 600×650px, cropped close with no empty space around them. Shown standing in the winner's row on the Main leaderboard (280×305 on a laptop), as theopen.com does. Left blank, the row shows no picture, just the champion's name.",
      },
    },
    {
      // Needs the championships_gallery table, created by hand in Supabase before this shipped --
      // there are no migrations here and the adapter only pushes schema in development.
      name: "gallery",
      label: "Photo Gallery",
      type: "array",
      labels: { singular: "Photo", plural: "Photos" },
      maxRows: 24,
      admin: {
        description: "Optional. Powers the \"Best of the [year] Legs Open\" photo band under this championship's Overview on Previous Opens, and joins the venue page's photo slider. Landscape, at least 1600×960px. Hidden until you add a photo.",
      },
      fields: [
        { name: "image", type: "upload", relationTo: "media", required: true },
        { name: "caption", type: "text" },
      ],
    },
    {
      name: "venueStripPhoto",
      label: "Photo (venue page strip)",
      type: "upload",
      relationTo: "media",
      admin: {
        description:
          "Optional. The photograph on this championship's card in the \"The Legs Open at [venue]\" strip, shown as a tall 224×340 crop from the centre, so any shape works if the subject is in the middle (at least 600×900px). Leave blank and the strip uses the Champion Photo above, so the two sections only differ once you want them to. Useful where the moment belongs in the strip and the portrait belongs in Champion Golfers -- a shot of the closing hole, the presentation, the weather.",
      },
    },
    {
      name: "venueStripCaption",
      label: "Caption (venue page strip)",
      type: "text",
      admin: {
        description:
          "Optional. The line written across this championship's photograph in the \"The Legs Open at [venue]\" strip. A sentence about what happened rather than a name -- theopen.com's read \"Hogan wins on his only appearance\" and \"Cotton wins for the second time\". Left blank, the photograph carries its year and nothing else.",
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
      // Optional. Left empty, the Overview tab writes itself from the fields above and below --
      // champion, venue, score, margin, runner-up, the lead at the turn, the largest lead of the
      // day, the Stableford and Scratch winners. That is why all fourteen backdated championships
      // read sensibly without anyone having written a word for them.
      //
      // Filled, this replaces those sentences outright rather than joining them, so a year that
      // deserves a proper account can have one without the generated lines repeating it
      // underneath.
      name: "overviewVideoUrl",
      type: "text",
      admin: {
        description:
          "Optional. A YouTube or Vimeo link, or the address of a video in Media (e.g. /api/media/file/clip.mp4). Appears under the opening paragraph of the Overview tab, where The Open puts its own player. YouTube watch links are converted to an embed. To host a file, the upload field below is simpler.",
      },
    },
    {
      // Needs the overview_video_file_id column on championships, added by hand in Supabase before
      // this shipped -- there are no migrations here and the adapter only pushes schema in
      // development.
      name: "overviewVideoFile",
      label: "Overview Video (file)",
      type: "upload",
      relationTo: "media",
      filterOptions: { mimeType: { contains: "video" } },
      admin: {
        description:
          "Optional. A video file hosted on the site itself -- an MP4 at 1920×1080, ideally under 50MB (a 20-second clip is about 8MB). Plays in the same place as the link above, with the Champion Photo as its still before play, and takes priority over the link when both are set. Use the link instead for long videos: YouTube adjusts quality for slow connections and costs nothing to stream.",
      },
    },
    {
      name: "overviewStory",
      type: "richText",
      admin: {
        description:
          "Optional. The Overview tab's story. Leave empty and it is written automatically from the result and the records below. Anything here replaces that entirely.",
      },
    },
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
