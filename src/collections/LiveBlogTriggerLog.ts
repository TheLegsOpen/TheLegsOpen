import type { CollectionConfig } from "payload";

/**
 * One row per live-blog trigger candidate evaluated by src/lib/live-blog/publication-policy.ts
 * -- published or not. Exists purely for observability: answering "why didn't the site post
 * when Player X took the lead?" without reading server logs. `fingerprint` is unique so a
 * retried/replayed scorecard save can't evaluate (or publish) the same candidate twice.
 *
 * Internal debugging data, not part of the public site -- read access is admin-only, unlike
 * every public-facing collection in this project which defaults to `read: () => true`.
 */
export const LiveBlogTriggerLog: CollectionConfig = {
  slug: "live-blog-trigger-log",
  labels: { singular: "Live Blog Trigger Log", plural: "Live Blog Trigger Log" },
  admin: {
    useAsTitle: "fingerprint",
    defaultColumns: ["category", "player", "championship", "significance", "threshold", "selected", "suppressionReason", "evaluatedAt"],
    description:
      "Read-only diagnostic trail: every live-blog trigger candidate the site has evaluated, whether it was published, and why it was suppressed if not. Nothing here is shown on the public site.",
  },
  access: {
    read: ({ req }) => Boolean(req.user),
  },
  fields: [
    { name: "fingerprint", type: "text", required: true, unique: true, admin: { readOnly: true } },
    { name: "championship", type: "relationship", relationTo: "championships", required: true, admin: { readOnly: true } },
    { name: "player", type: "relationship", relationTo: "players", admin: { readOnly: true } },
    { name: "category", type: "text", required: true, admin: { readOnly: true } },
    { name: "holeNumber", type: "number", admin: { readOnly: true } },
    { name: "significance", type: "number", required: true, admin: { readOnly: true, description: "0-100 score computed by significance.ts at evaluation time." } },
    { name: "threshold", type: "number", required: true, admin: { readOnly: true, description: "minimumSignificance in effect (from the Live Blog Config global) when this was evaluated." } },
    { name: "selected", type: "checkbox", defaultValue: false, admin: { readOnly: true, description: "True once this candidate actually produced a published post." } },
    { name: "suppressed", type: "checkbox", defaultValue: true, admin: { readOnly: true } },
    {
      name: "suppressionReason",
      type: "select",
      admin: { readOnly: true },
      options: [
        { label: "Disabled", value: "DISABLED" },
        { label: "Below minimum significance", value: "LOW_SIGNIFICANCE" },
        { label: "Cooldown", value: "COOLDOWN" },
        { label: "Max posts per hour", value: "MAX_PER_HOUR" },
        { label: "Duplicate candidate", value: "DUPLICATE" },
        { label: "Fact validation failed", value: "FACT_VALIDATION_FAILED" },
      ],
    },
    { name: "post", type: "relationship", relationTo: "live-blog-posts", admin: { readOnly: true, description: "The published post this candidate produced, if any." } },
    {
      name: "evaluatedAt",
      type: "date",
      required: true,
      defaultValue: () => new Date().toISOString(),
      admin: { readOnly: true, date: { pickerAppearance: "dayAndTime", displayFormat: "dd/MM/yyyy HH:mm:ss" } },
    },
  ],
};
