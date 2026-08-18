import type { GlobalConfig } from "payload";

import { revalidateMediaPage } from "@/lib/revalidate";
import { ICON_OPTIONS } from "@/lib/icon-options";

export const MediaPageSettings: GlobalConfig = {
  slug: "media-page",
  label: "Media Page",
  access: { read: () => true },
  hooks: { afterChange: [revalidateMediaPage] },
  admin: { description: "Text and resource cards shown on the Media Centre page." },
  fields: [
    {
      type: "collapsible",
      label: "Hero",
      fields: [
        { name: "heroEyebrow", label: "Eyebrow", type: "text", defaultValue: "Media Centre" },
        { name: "heroTitle", label: "Title", type: "text", required: true, defaultValue: "Press & media" },
        {
          name: "heroDescription",
          label: "Description",
          type: "textarea",
          required: true,
          defaultValue: "Accreditation, resources and contacts for journalists and broadcasters covering The Legs Open.",
        },
      ],
    },
    {
      type: "collapsible",
      label: "Resources",
      fields: [
        { name: "resourcesEyebrow", label: "Eyebrow", type: "text", defaultValue: "Resources" },
        { name: "resourcesTitle", label: "Title", type: "text", required: true, defaultValue: "For accredited media" },
        {
          name: "resources",
          type: "array",
          labels: { singular: "Resource", plural: "Resources" },
          fields: [
            { name: "icon", type: "select", required: true, options: [...ICON_OPTIONS] },
            { name: "title", type: "text", required: true },
            { name: "description", type: "textarea", required: true },
          ],
        },
      ],
    },
    {
      type: "collapsible",
      label: "Call to Action",
      fields: [
        { name: "ctaTitle", label: "Title", type: "text", required: true, defaultValue: "Need to reach the press office?" },
        {
          name: "ctaDescription",
          label: "Description",
          type: "textarea",
          required: true,
          defaultValue: "Send accreditation requests and media enquiries through our contact form.",
        },
        { name: "ctaButtonLabel", label: "Button label", type: "text", required: true, defaultValue: "Contact us" },
      ],
    },
  ],
};
