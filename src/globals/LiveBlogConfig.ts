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
