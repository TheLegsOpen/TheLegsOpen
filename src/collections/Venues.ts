import type { CollectionConfig } from "payload";

import { revalidateVenues } from "@/lib/revalidate";
import { geocodeVenue } from "@/lib/geocoding";
import { COUNTRIES, countryName } from "@/data/countries";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const Venues: CollectionConfig = {
  slug: "venues",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "location", "timesHosted"],
    components: {
      edit: {
        beforeDocumentControls: ["/components/admin/RecordNav#RecordNav"],
      },
    },
  },
  access: {
    read: () => true,
  },
  fields: [
    { name: "name", type: "text", required: true },
    { name: "slug", type: "text", unique: true, index: true, admin: { position: "sidebar" } },
    { name: "location", type: "text", required: true },
    { name: "region", type: "text", required: true },
    {
      type: "row",
      fields: [
        {
          name: "latitude",
          type: "number",
          admin: {
            width: "50%",
            description: "Powers the homepage weather widget when this venue's championship is active. Auto-filled from the venue's name/location on save if left blank -- edit directly to override.",
          },
        },
        { name: "longitude", type: "number", admin: { width: "50%" } },
      ],
    },
    {
      name: "countryCode",
      label: "Country",
      type: "select",
      options: COUNTRIES.map((c) => ({ label: c.name, value: c.code })),
      admin: { description: "Shown as a flag badge on the venue's image." },
    },
    {
      name: "country",
      type: "text",
      admin: { readOnly: true, description: "Set automatically from the Country field above." },
    },
    {
      name: "parYardage",
      type: "text",
      admin: {
        readOnly: true,
        description: "Automatically calculated from Hole Setup below once all 18 holes have Par and Yards entered.",
      },
    },
    { name: "timesHosted", type: "number", required: true },
    { name: "firstHosted", type: "number", required: true },
    { name: "lastHosted", type: "number", required: true },
    { name: "description", type: "textarea", required: true },
    {
      name: "overview",
      type: "array",
      labels: { singular: "Paragraph", plural: "Overview paragraphs" },
      fields: [{ name: "paragraph", type: "textarea", required: true }],
    },
    {
      name: "stats",
      type: "array",
      fields: [
        { name: "label", type: "text", required: true },
        { name: "value", type: "text", required: true },
      ],
    },
    { name: "imageLabel", type: "text", required: true, admin: { description: "Caption used when no image is uploaded, and as alt text when one is." } },
    {
      name: "image",
      type: "upload",
      relationTo: "media",
      admin: {
        description:
          "Shown on the venues grid and at the top of the venue page. Falls back to a placeholder when not set. Recommended: landscape, at least 1200×900px (4:3).",
      },
    },
    {
      name: "gallery",
      label: "Photo Gallery",
      type: "array",
      labels: { singular: "Photo", plural: "Photos" },
      maxRows: 12,
      admin: { description: "Powers the \"Pictures at [venue]\" slider on this venue's page. Add as many or as few as you like." },
      fields: [
        { name: "image", type: "upload", relationTo: "media", required: true },
        { name: "caption", type: "text" },
      ],
    },
    {
      name: "featuredArticles",
      label: "Featured Articles",
      type: "relationship",
      relationTo: "articles",
      hasMany: true,
      maxRows: 3,
      admin: {
        description: "Up to 3 articles to feature on this venue's page. Leave blank to hide the section entirely.",
      },
    },
    {
      type: "collapsible",
      label: "Hole Setup",
      admin: {
        description:
          "Course rating, slope, and par/yardage/stroke index for each hole. For future use in the leaderboard and scoring automation — not shown on the public site yet.",
      },
      fields: [
        {
          name: "courseImport",
          type: "ui",
          admin: {
            components: {
              Field: "/components/admin/CourseImportField#CourseImportField",
            },
          },
        },
        {
          type: "row",
          fields: [
            {
              name: "courseRating",
              label: "Course Rating™",
              type: "number",
              admin: { width: "50%", step: 0.1, description: "e.g. 71.0" },
            },
            {
              name: "slopeRating",
              label: "SLOPE®",
              type: "number",
              min: 55,
              max: 155,
              admin: { width: "50%", description: "USGA scale, 55–155." },
            },
          ],
        },
        {
          name: "holes",
          type: "array",
          labels: { singular: "Hole", plural: "Holes" },
          maxRows: 18,
          defaultValue: Array.from({ length: 18 }, (_, i) => ({ holeNumber: i + 1 })),
          admin: {
            description: "Hole number fills in automatically based on position — just enter Yards, Par and SI for each hole.",
            components: {
              Field: "/components/admin/HolesTableField#HolesTableField",
            },
          },
          fields: [
            {
              type: "row",
              fields: [
                {
                  name: "holeNumber",
                  label: "Hole",
                  type: "number",
                  admin: { readOnly: true, width: "20%", description: "Set automatically from the row's position." },
                },
                { name: "par", type: "number", required: true, min: 3, max: 6, admin: { width: "25%" } },
                { name: "yards", type: "number", required: true, admin: { width: "25%" } },
                {
                  name: "si",
                  label: "SI",
                  type: "number",
                  required: true,
                  min: 1,
                  max: 18,
                  admin: { width: "25%", description: "Stroke Index (1–18)." },
                },
              ],
            },
          ],
        },
        {
          type: "row",
          fields: [
            { name: "outPar", label: "OUT (Par)", type: "number", admin: { readOnly: true, hidden: true, width: "16%" } },
            { name: "outYards", label: "OUT (Yards)", type: "number", admin: { readOnly: true, hidden: true, width: "16%" } },
            { name: "inPar", label: "IN (Par)", type: "number", admin: { readOnly: true, hidden: true, width: "16%" } },
            { name: "inYards", label: "IN (Yards)", type: "number", admin: { readOnly: true, hidden: true, width: "16%" } },
            { name: "totalPar", label: "TOTAL (Par)", type: "number", admin: { readOnly: true, hidden: true, width: "16%" } },
            { name: "totalYards", label: "TOTAL (Yards)", type: "number", admin: { readOnly: true, hidden: true, width: "16%" } },
          ],
        },
      ],
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data }) => {
        if (data && !data.slug && data.name) {
          data.slug = slugify(data.name);
        }
        if (data && data.countryCode) {
          data.country = countryName(data.countryCode);
        }
        // Only when both are blank -- never overwrites a manually entered or previously
        // auto-filled value, and never re-queries on every subsequent save of the same venue.
        if (data && data.latitude == null && data.longitude == null && data.name) {
          const geocoded = await geocodeVenue({ name: data.name, location: data.location, region: data.region, country: data.country });
          if (geocoded) {
            data.latitude = geocoded.latitude;
            data.longitude = geocoded.longitude;
          }
        }
        if (data && Array.isArray(data.holes)) {
          data.holes = data.holes.map((hole: Record<string, unknown>, index: number) => ({ ...hole, holeNumber: index + 1 }));
          const out = data.holes.slice(0, 9);
          const inHoles = data.holes.slice(9, 18);
          const sum = (rows: { par?: number; yards?: number }[], key: "par" | "yards") =>
            rows.reduce((total, row) => total + (row[key] ?? 0), 0);
          data.outPar = sum(out, "par");
          data.outYards = sum(out, "yards");
          data.inPar = sum(inHoles, "par");
          data.inYards = sum(inHoles, "yards");
          data.totalPar = data.outPar + data.inPar;
          data.totalYards = data.outYards + data.inYards;

          const holesComplete =
            data.holes.length === 18 && data.holes.every((hole: { par?: number; yards?: number }) => hole.par && hole.yards);
          if (holesComplete) {
            data.parYardage = `Par ${data.totalPar} · ${data.totalYards.toLocaleString()} yards`;
          }
        }
        return data;
      },
    ],
    afterChange: [revalidateVenues],
    afterDelete: [revalidateVenues],
  },
};
