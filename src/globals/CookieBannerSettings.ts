import type { GlobalConfig } from "payload";

import { revalidateSite } from "@/lib/revalidate";

export const CookieBannerSettings: GlobalConfig = {
  slug: "cookie-banner-settings",
  label: "Cookie Pop-up",
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [revalidateSite],
  },
  fields: [
    { name: "title", type: "text", defaultValue: "Your Cookies", admin: { description: "Shown as the heading in the cookie pop-up." } },
    {
      name: "bodyParagraph1",
      type: "textarea",
      defaultValue: "Accepting all cookies helps this site remember your preferences between visits.",
      admin: { description: "First paragraph of the pop-up body." },
    },
    {
      name: "bodyParagraph2",
      type: "textarea",
      admin: { description: "Optional second paragraph. Leave blank to show only the first." },
    },
    { name: "acceptLabel", type: "text", defaultValue: "Accept all cookies", admin: { description: "Text on the accept button." } },
    { name: "declineLabel", type: "text", defaultValue: "Decline non-essential cookies", admin: { description: "Text on the decline link." } },
  ],
};
