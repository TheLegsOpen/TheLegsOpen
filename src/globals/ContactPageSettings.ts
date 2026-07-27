import type { GlobalConfig } from "payload";

import { revalidateSite } from "@/lib/revalidate";

export const ContactPageSettings: GlobalConfig = {
  slug: "contact-page",
  label: "Contact Page",
  access: { read: () => true },
  hooks: { afterChange: [revalidateSite] },
  admin: { description: "Text shown at the top of the Contact Us page, above the enquiry form." },
  fields: [
    { name: "heroEyebrow", label: "Eyebrow", type: "text" },
    { name: "heroTitle", label: "Title", type: "text", required: true, defaultValue: "Contact us" },
    {
      name: "heroDescription",
      label: "Description",
      type: "textarea",
      required: true,
      defaultValue: "Questions about tickets, membership or media access? Send us a message.",
    },
  ],
};
