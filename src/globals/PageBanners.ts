import type { GlobalConfig } from "payload";

import { revalidateSite } from "@/lib/revalidate";

const RECOMMENDED =
  "Falls back to a placeholder when not set. Recommended: wide landscape, at least 1920×1080px — it fills a full-width banner roughly 60% of the viewport height, with page text overlaid on the bottom-left, so keep the main subject centred or to the right.";

export const PageBanners: GlobalConfig = {
  slug: "page-banners",
  label: "Page Banners",
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [revalidateSite],
  },
  admin: {
    description: "Banner photo shown at the top of each listing page. Each is optional and falls back to a placeholder.",
  },
  fields: [
    { name: "leaderboard", type: "upload", relationTo: "media", admin: { description: RECOMMENDED } },
    { name: "teeTimes", type: "upload", relationTo: "media", label: "Tee Times", admin: { description: RECOMMENDED } },
    { name: "venues", type: "upload", relationTo: "media", admin: { description: RECOMMENDED } },
    { name: "field", type: "upload", relationTo: "media", admin: { description: RECOMMENDED } },
  ],
};
