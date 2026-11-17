import type { GlobalConfig } from "payload";

import { revalidateLiveBlogConfig } from "@/lib/revalidate";

/**
 * Tunable thresholds for the live-blog trigger/publication pipeline (src/lib/live-blog/
 * significance.ts and publication-policy.ts), so none of the "how much is too much" decisions
 * are hard-coded literals buried in application code.
 */
export const LiveBlogConfig: GlobalConfig = {
  slug: "live-blog-config",
  label: "Live Blog Config",
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [revalidateLiveBlogConfig],
  },
  fields: [
    {
      type: "collapsible",
      label: "Summary box (top of the Live Blog page)",
      admin: {
        description:
          "The yellow box above the posts, like theopen.com's \"LIVE · The 154th Open\" panel. Leave everything as it is and it writes itself from the leaderboards: the three leaders while play is on, the three winners once it's over.",
      },
      fields: [
        { name: "summaryShow", type: "checkbox", label: "Show the summary box", defaultValue: true },
        {
          name: "summaryTitle",
          type: "text",
          label: "Title",
          admin: { description: "Leave empty for the championship's name, e.g. \"The 14th Legs Open\"." },
        },
        {
          name: "summaryBadge",
          type: "select",
          label: "Badge",
          enumName: "enum_live_blog_config_summary_badge",
          defaultValue: "auto",
          options: [
            { label: "Automatic (LIVE while play is on, FINAL after)", value: "auto" },
            { label: "LIVE", value: "live" },
            { label: "FINAL", value: "final" },
            { label: "No badge", value: "none" },
          ],
        },
        {
          name: "summaryAutoLines",
          type: "checkbox",
          label: "Include the automatic leader / winner lines",
          defaultValue: true,
          admin: { description: "Untick to show only your own points below." },
        },
        {
          name: "summaryPoints",
          type: "richText",
          label: "Your points",
          admin: {
            description:
              "Shown after the automatic lines (or on their own if those are switched off). Use a bulleted list, one point per bullet; links work, e.g. \"Full report\" or \"Tee times here\".",
          },
        },
      ],
    },
    {
      name: "enabled",
      type: "checkbox",
      defaultValue: true,
      admin: { description: "Master switch. Turn off to silence all automated live-blog posts (hand-written posts are unaffected)." },
    },
    {
      name: "minimumSignificance",
      type: "number",
      required: true,
      defaultValue: 35,
      min: 0,
      max: 100,
      admin: {
        description:
          "A candidate must score at least this (0-100, see significance.ts) to publish. Aces, eagles, lead changes, ties, winner confirmation and every leaderboard-movement event are always well above this by design -- raising it mainly cuts down on ordinary birdie/bogey posts for players not in contention.",
      },
    },
    {
      name: "cooldownSeconds",
      type: "number",
      required: true,
      defaultValue: 90,
      min: 0,
      admin: { description: "Minimum gap between automated posts once one has published. Lead changes, ties, pressure moments, aces and winner confirmation always bypass this." },
    },
    {
      name: "maxPostsPerHour",
      type: "number",
      required: true,
      defaultValue: 16,
      min: 1,
      admin: {
        description:
          "Ceiling on automated posts per championship per rolling hour. Same bypass list as the cooldown above. 8 (the old default) was untested at real pacing -- a full 18-hole replay with several groups posting concurrently hit the cap repeatedly even at 100. 16 is a more realistic starting point for a real event.",
      },
    },
  ],
};
