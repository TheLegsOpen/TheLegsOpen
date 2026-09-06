import type { CollectionConfig } from "payload";
import { getPayload } from "payload";

import { COUNTRIES, countryName } from "@/data/countries";
import { revalidatePlayers } from "@/lib/revalidate";
import configPromise from "@/payload.config";

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

/** USGA/WHS Course Handicap formula: Handicap Index x (Slope Rating / 113) + (Course Rating - Par), rounded to the nearest whole stroke. */
function calculateCourseHandicap(handicapIndex: number, slopeRating: number, courseRating: number, par: number): number {
  return Math.round(handicapIndex * (slopeRating / 113) + (courseRating - par));
}

/**
 * The venue for whichever championship is "being played" -- same active/most-recent-by-year rule
 * used everywhere else (see getActiveChampionshipSummary in lib/data/championships.ts, kept
 * separate here rather than imported to avoid this collection depending on that data-access seam
 * just for one field). Returns undefined if that venue hasn't had its Course Rating/Slope/Par
 * filled in yet, so a half-configured venue never produces a bogus handicap.
 */
async function resolveActiveVenueRating(): Promise<{ slopeRating: number; courseRating: number; par: number } | undefined> {
  const payload = await getPayload({ config: configPromise });
  const championships = await payload.find({ collection: "championships", limit: 500, depth: 1, sort: "year" });
  if (championships.docs.length === 0) return undefined;

  const activeIndex = championships.docs.findIndex((doc) => doc.isActive);
  const doc = championships.docs[activeIndex === -1 ? championships.docs.length - 1 : activeIndex];
  const venue = typeof doc.venue === "object" ? doc.venue : undefined;
  if (!venue || venue.slopeRating == null || venue.courseRating == null || !venue.totalPar) return undefined;

  return { slopeRating: venue.slopeRating, courseRating: venue.courseRating, par: venue.totalPar };
}

export const Players: CollectionConfig = {
  slug: "players",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "country", "age", "previousOpens"],
    description: "Adding a lot of players at once? Use the bulk upload tool at /admin-bulk-players instead of entering them one by one here.",
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
      name: "handicapIndex",
      label: "Handicap Index",
      type: "number",
      admin: {
        step: 0.1,
        description:
          "Admin-only, never shown on the public site. The player's real, portable handicap index (e.g. from a national handicap database). When set, Championship Handicap below is recalculated automatically for whichever venue is currently active, using that venue's Course Rating and Slope (set on the Venues collection, under Hole Setup). Leave blank to keep setting Championship Handicap manually.",
      },
      access: {
        read: ({ req }) => Boolean(req.user),
      },
    },
    {
      name: "championshipHandicap",
      label: "Championship Handicap",
      type: "number",
      admin: {
        description:
          "The player's championship handicap for the currently active venue. Auto-calculated from Handicap Index above whenever that's set and the active venue has its Course Rating/Slope filled in -- otherwise enter manually.",
      },
    },
    { name: "previousOpens", type: "number", required: true, defaultValue: 0 },
    {
      name: "turnedPro",
      label: "Turned Pro",
      type: "number",
      admin: { description: "The year this player turned professional. Leave blank if not applicable or unknown." },
    },
    {
      name: "debutYear",
      label: "Legs Open Debut",
      type: "number",
      admin: {
        description:
          "The year of this player's first Legs Open appearance. Only needed for years before scorecards were tracked digitally — once real scorecard history exists it's detected automatically and this is used as a fallback.",
      },
    },
    {
      name: "gallery",
      label: "Photo Gallery",
      type: "array",
      labels: { singular: "Photo", plural: "Photos" },
      maxRows: 12,
      admin: { description: "Powers the picture slider on this player's profile page. Add as many or as few as you like." },
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
        description: "Up to 3 articles to feature on this player's profile page. Leave blank to show the latest published articles instead.",
      },
    },
    {
      name: "inField",
      label: "In Current Field",
      type: "checkbox",
      defaultValue: false,
      admin: {
        description: "Tick for players competing in the current championship — narrows the player picker when building tee times, and is what the public Field page shows.",
        position: "sidebar",
      },
    },
    {
      name: "hideAge",
      label: "Hide Age (deceased)",
      type: "checkbox",
      defaultValue: false,
      admin: {
        description: "Tick for a player who has since passed away — hides their age everywhere on the public site (profile page, Field page).",
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
      async ({ data }) => {
        if (data && !data.slug && data.name) {
          data.slug = slugify(data.name);
        }
        if (data && data.countryCode) {
          data.country = countryName(data.countryCode);
        }
        if (data && data.dateOfBirth) {
          data.age = calculateAge(data.dateOfBirth);
        }
        if (data && typeof data.handicapIndex === "number") {
          const venueRating = await resolveActiveVenueRating();
          if (venueRating) {
            data.championshipHandicap = calculateCourseHandicap(
              data.handicapIndex,
              venueRating.slopeRating,
              venueRating.courseRating,
              venueRating.par,
            );
          }
        }
        return data;
      },
    ],
    afterChange: [revalidatePlayers],
    afterDelete: [revalidatePlayers],
  },
};
