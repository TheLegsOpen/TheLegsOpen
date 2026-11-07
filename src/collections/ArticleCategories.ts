import type { CollectionConfig } from "payload";

import { revalidateArticles } from "@/lib/revalidate";

/**
 * The categories an article can be filed under, as rows rather than as a list in the code.
 *
 * They used to be a `select` field's hardcoded options, which Payload stores as a Postgres enum --
 * so adding one meant a code change, an ALTER TYPE run by hand against production before the
 * deploy, and four separate places in the source kept in step. Renaming one was worse: the name
 * was copied onto every article, so a rename was a data migration. As rows, a rename is one edit
 * and every article follows it.
 */
export const ArticleCategories: CollectionConfig = {
  slug: "article-categories",
  labels: { singular: "Article Category", plural: "Article Categories" },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "sortOrder", "updatedAt"],
    group: "Content",
    description: "Used by the category dropdown on an article, and by the filter buttons on the News page.",
  },
  access: { read: () => true },
  hooks: {
    // A rename changes what every article in that category displays, so the article pages and
    // the news listing have to be rebuilt, not just this record.
    afterChange: [revalidateArticles],
    afterDelete: [revalidateArticles],
    // The foreign key refuses the delete anyway, but a raw constraint violation surfaces in the
    // admin as an unexplained failure. Say what is wrong and how many articles are in the way.
    beforeDelete: [
      async ({ req, id }) => {
        const inUse = await req.payload.find({
          collection: "articles",
          where: { category: { equals: id } },
          limit: 0,
          depth: 0,
          draft: true,
        });
        if (inUse.totalDocs > 0) {
          throw new Error(
            `${inUse.totalDocs} article${inUse.totalDocs === 1 ? "" : "s"} still use this category. Move them to another one first, then delete it.`,
          );
        }
      },
    ],
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
      unique: true,
      admin: { description: "Shown on article cards and as a filter button. Renaming it here renames it everywhere." },
    },
    {
      name: "sortOrder",
      type: "number",
      admin: {
        description:
          "Lowest first, and it only controls the order of the filter buttons on the News page. Leave blank and the category sorts after the numbered ones, alphabetically.",
      },
    },
  ],
};
