import type { CollectionConfig } from "payload";

import { revalidateArticles } from "@/lib/revalidate";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const Articles: CollectionConfig = {
  slug: "articles",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "_status", "category", "publishedAt"],
    components: {
      edit: {
        beforeDocumentControls: ["/components/admin/RecordNav#RecordNav"],
      },
    },
  },
  access: {
    read: () => true,
    readVersions: ({ req }) => Boolean(req.user),
  },
  versions: {
    drafts: true,
  },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "slug", type: "text", unique: true, index: true, admin: { position: "sidebar" } },
    { name: "dek", type: "textarea", required: true, admin: { description: "One-sentence standfirst shown on cards and the article header." } },
    {
      // A relationship rather than the hardcoded `select` this used to be. Payload stores a
      // select as a Postgres enum, so adding a category meant an ALTER TYPE against production
      // plus four places in the source kept in step -- and Postgres cannot remove an enum value,
      // so a mistake was permanent. Rows can be added, renamed and reordered in the admin, and a
      // rename reaches every article at once because the name is stored in one place.
      name: "category",
      type: "relationship",
      relationTo: "article-categories",
      required: true,
      admin: { description: "Manage the list itself under Article Categories." },
    },
    { name: "publishedAt", type: "date", required: true, admin: { date: { pickerAppearance: "dayOnly" } } },
    {
      // What fills the rail on a championship's Overview tab. Deliberately a relationship rather
      // than matching on the year: publishedAt would group a piece with whatever championship
      // happened to share its year, and the backdating left genuine features sitting in those
      // years -- the roll of honour was published in August 2026 and belongs to no championship
      // at all. Tagging is explicit, so the rail only ever shows pieces someone put there.
      name: "championship",
      type: "relationship",
      relationTo: "championships",
      admin: {
        position: "sidebar",
        description: "Optional. Tag this to a championship to have it appear in that year's Overview rail.",
      },
    },
    {
      // Lets a championship's Overview tab be the write-up itself rather than a second telling of
      // it. Without this a report has to be written twice -- once as an article, once into the
      // championship's own overviewStory -- and the two drift apart the moment either is edited.
      name: "isChampionshipOverview",
      label: "Use as this championship's Overview",
      type: "checkbox",
      admin: {
        position: "sidebar",
        // Meaningless until the piece is tagged, so it stays out of the way until then.
        condition: (data) => Boolean(data?.championship),
        description:
          "Renders this whole article on the championship's Overview tab in place of the generated summary, and drops it from the Related list beside it so it is not offered twice. A championship's own overviewStory, if anyone has written one, still wins over this.",
      },
    },
    { name: "readTimeMinutes", type: "number", required: true, defaultValue: 4 },
    {
      name: "heroLabel",
      type: "text",
      // Not required, and dropping that needed no migration: Articles has drafts enabled, and
      // Payload makes every column on a drafts-enabled collection's table nullable
      // (disableNotNull in @payloadcms/drizzle's buildRawSchema), so `required: true` was only
      // ever a validation rule here, never a NOT NULL.
      //
      // The hook below fills it anyway, because blank is worse than absent: it would put alt=""
      // on the photograph and seed the generated placeholder off an empty string.
      //
      // Worth knowing for the next field like this: required-but-empty only ever bit on publish.
      // Draft saves skip validation entirely, so an article can be saved as a draft with this
      // null -- which is exactly how article 30 came to exist -- and only fails when published.
      admin: {
        description:
          "Alt text for the photograph, and the caption on the generated artwork when there is no photograph. Leave it blank and it is taken from the image's own Alt text, or from the title when there is no image.",
      },
    },
    {
      name: "image",
      type: "upload",
      relationTo: "media",
      admin: {
        description:
          "Shown on article cards and at the top of the article. Falls back to a placeholder when not set. Recommended: landscape, at least 1600×900px — it's cropped to both a 4:3 card and a 21:9 banner, so keep the subject centred.",
      },
    },
    { name: "body", type: "richText", required: true },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, originalDoc, req }) => {
        if (!data) return data;

        if (!data.slug && data.title) {
          data.slug = slugify(data.title);
        }

        /*
         * Fill Hero Label rather than making someone write it twice.
         *
         * It is the photograph's alt text, the card's aria-label, and -- when there is no
         * photograph -- the seed and caption for the generated placeholder. That last job is why
         * a value has to exist. But an article with a picture already has alt text, because `alt`
         * is required on every Media upload, so asking for it again just duplicates a sentence
         * that is already written.
         *
         * Reads through to originalDoc so a partial update that simply does not mention this
         * field keeps what is there -- without that, saving any other field would overwrite a
         * hand-written caption with the title. Clearing the field on purpose sends "", which is
         * blank rather than absent, and does re-derive.
         */
        const current = data.heroLabel ?? originalDoc?.heroLabel;
        if (typeof current === "string" && current.trim()) return data;

        const image = data.image ?? originalDoc?.image;
        const imageId = typeof image === "object" && image ? image.id : image;
        if (imageId) {
          try {
            const media = await req.payload.findByID({ collection: "media", id: imageId, depth: 0 });
            if (typeof media?.alt === "string" && media.alt.trim()) {
              data.heroLabel = media.alt;
              return data;
            }
          } catch {
            // An upload that has since been deleted shouldn't block the save -- fall through to
            // the title, which is required and so always there.
          }
        }

        const title = data.title ?? originalDoc?.title;
        if (typeof title === "string" && title.trim()) {
          data.heroLabel = title;
        }
        return data;
      },
    ],
    afterChange: [revalidateArticles],
    afterDelete: [revalidateArticles],
  },
};
