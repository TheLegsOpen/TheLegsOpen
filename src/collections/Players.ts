import type { CollectionConfig } from "payload";

import { COUNTRIES, countryName } from "@/data/countries";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function calculateAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

export const Players: CollectionConfig = {
  slug: "players",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "country", "age", "previousOpens"],
  },
  access: {
    read: () => true,
  },
  fields: [
    { name: "name", type: "text", required: true },
    { name: "slug", type: "text", unique: true, index: true, admin: { position: "sidebar" } },
    {
      name: "countryCode",
      label: "Country",
      type: "select",
      required: true,
      options: COUNTRIES.map((c) => ({ label: c.name, value: c.code })),
    },
    {
      name: "country",
      type: "text",
      required: true,
      admin: { readOnly: true, description: "Set automatically from the Country field above." },
    },
    {
      name: "dateOfBirth",
      label: "Date of Birth",
      type: "date",
      admin: {
        date: { pickerAppearance: "dayOnly", displayFormat: "dd/MM/yyyy" },
        description: "UK format (DD/MM/YYYY). When set, Age below is calculated automatically and can't be hand-edited. Admin-only — never shown on the public site.",
      },
      access: {
        read: ({ req }) => Boolean(req.user),
      },
    },
    {
      name: "age",
      type: "number",
      admin: { description: "Calculated automatically once Date of Birth is set. Enter manually only while Date of Birth is blank — leave blank if unknown." },
    },
    {
      name: "championshipHandicap",
      label: "Championship Handicap",
      type: "number",
      admin: { description: "The player's championship handicap. Leave blank if not applicable." },
    },
    { name: "previousOpens", type: "number", required: true, defaultValue: 0 },
    {
      name: "inField",
      label: "In Current Field",
      type: "checkbox",
      defaultValue: false,
      admin: {
        description: "Tick for players competing in the current championship — narrows the player picker when building tee times.",
        position: "sidebar",
      },
    },
    {
      name: "cdhNumber",
      label: "CDH Number",
      type: "text",
      maxLength: 12,
      validate: (value: unknown) => {
        if (!value) return true;
        return /^\d{1,12}$/.test(String(value)) || "Numeric only, up to 12 digits.";
      },
      admin: {
        description: "Up to 12 numeric digits. For future handicap-database integration — admin-only, never shown on the public site.",
      },
      access: {
        read: ({ req }) => Boolean(req.user),
      },
    },
    {
      name: "photo",
      type: "upload",
      relationTo: "media",
      admin: {
        description:
          "Shown on the roster grid and profile page. Falls back to a placeholder when not set. Recommended: at least 1200×1200px — it's cropped to both a 3:4 portrait card and a 4:3 profile image, so keep the subject centred.",
      },
    },
    { name: "bio", type: "richText" },
  ],
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (data && !data.slug && data.name) {
          data.slug = slugify(data.name);
        }
        if (data && data.countryCode) {
          data.country = countryName(data.countryCode);
        }
        if (data && data.dateOfBirth) {
          data.age = calculateAge(data.dateOfBirth);
        }
        return data;
      },
    ],
  },
};
