import type { Block } from "payload";

/**
 * A video placed anywhere in an article's body, as theopen.com runs one between the paragraphs of a
 * write-up. Paste a YouTube or Vimeo link (as copied from the address bar), or pick a video from
 * Media; rendered by OverviewVideo (src/components/previous-opens/overview-video.tsx), the same
 * player as the Previous Opens overview, full width at 16:9 with the caption under it.
 *
 * Stored inside the article's body JSON, so it needs no database columns.
 */
export const ArticleVideoBlock: Block = {
  slug: "video",
  labels: { singular: "Video", plural: "Videos" },
  fields: [
    {
      name: "url",
      type: "text",
      label: "Video link",
      admin: { description: "A YouTube or Vimeo link, as copied from the address bar, e.g. https://youtu.be/… Or leave empty and pick a file below." },
      validate: (value: string | null | undefined, { siblingData }: { siblingData: { file?: unknown } }) =>
        value?.trim() || siblingData?.file ? true : "Add a video link, or pick a video file from Media.",
    },
    {
      name: "file",
      type: "upload",
      relationTo: "media",
      label: "Or a video file from Media",
      filterOptions: { mimeType: { contains: "video" } },
      admin: { description: "Plays in the browser's own player, with no adverts. Wins over the link when both are set." },
    },
    {
      name: "caption",
      type: "text",
      admin: { description: "Optional. Shown under the video, e.g. \"Leisegang holes the winning putt on the 18th.\"" },
    },
  ],
};
