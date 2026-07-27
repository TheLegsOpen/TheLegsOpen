import type { GlobalConfig } from "payload";

import { revalidateSite } from "@/lib/revalidate";
import { ICON_OPTIONS } from "@/lib/icon-options";

export const CareersPageSettings: GlobalConfig = {
  slug: "careers-page",
  label: "Careers Page",
  access: { read: () => true },
  hooks: { afterChange: [revalidateSite] },
  admin: { description: "Text, values cards and open roles shown on the Careers page." },
  fields: [
    {
      type: "collapsible",
      label: "Hero",
      fields: [
        { name: "heroEyebrow", label: "Eyebrow", type: "text", defaultValue: "Work With Us" },
        { name: "heroTitle", label: "Title", type: "text", required: true, defaultValue: "Careers" },
        {
          name: "heroDescription",
          label: "Description",
          type: "textarea",
          required: true,
          defaultValue: "From year-round roles to championship-week volunteering, here's how to join the team behind The Legs Open.",
        },
      ],
    },
    {
      type: "collapsible",
      label: "Values",
      fields: [
        { name: "valuesEyebrow", label: "Eyebrow", type: "text", defaultValue: "Why work with us" },
        { name: "valuesTitle", label: "Title", type: "text", required: true, defaultValue: "Life at The Legs Open" },
        {
          name: "values",
          type: "array",
          labels: { singular: "Value", plural: "Values" },
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
      label: "Open Roles",
      fields: [
        { name: "rolesEyebrow", label: "Eyebrow", type: "text", defaultValue: "Open Roles" },
        { name: "rolesTitle", label: "Title", type: "text", required: true, defaultValue: "Current opportunities" },
        {
          name: "openRoles",
          type: "array",
          labels: { singular: "Role", plural: "Roles" },
          fields: [
            { name: "title", type: "text", required: true },
            { name: "location", type: "text", required: true },
            { name: "type", type: "text", required: true, admin: { description: 'e.g. "Full-time", "Seasonal", "Championship week".' } },
          ],
        },
      ],
    },
    {
      type: "collapsible",
      label: "Call to Action",
      fields: [
        { name: "ctaTitle", label: "Title", type: "text", required: true, defaultValue: "Don't see the right role?" },
        {
          name: "ctaDescription",
          label: "Description",
          type: "textarea",
          required: true,
          defaultValue: "We're always keen to hear from people who love the game and the game's original championship.",
        },
        { name: "ctaButtonLabel", label: "Button label", type: "text", required: true, defaultValue: "Get in touch" },
      ],
    },
  ],
};
