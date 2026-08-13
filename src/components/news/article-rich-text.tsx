import { RichText } from "@payloadcms/richtext-lexical/react";

import { cn } from "@/lib/utils";

/**
 * Renders an Article's Lexical body with real formatting -- lists, links, bold/italic, and line
 * breaks all survive, unlike the old lexicalToPlainParagraphs approach (see src/lib/lexical.ts),
 * which flattened every node down to plain text and silently dropped linebreak nodes entirely.
 * That's what produced a genuinely broken-looking page for any article using a manual list (see
 * the roll-of-honour article) -- Payload's own RichText/defaultJSXConverters handles every node
 * type the editor's toolbar actually offers, so anything an admin formats in the editor now
 * survives to the live page.
 */
export function ArticleRichText({ data, className }: { data: unknown; className?: string }) {
  return (
    <RichText
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data={data as any}
      className={cn(
        "flex flex-col gap-5 text-base leading-relaxed text-foreground",
        "[&_p]:leading-relaxed",
        "[&_ul]:ml-5 [&_ul]:list-disc [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2",
        "[&_ol]:ml-5 [&_ol]:list-decimal [&_ol]:flex [&_ol]:flex-col [&_ol]:gap-2",
        "[&_li]:leading-relaxed",
        "[&_a]:font-semibold [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:no-underline",
        "[&_strong]:font-bold",
        "[&_h1]:font-display [&_h1]:text-display-sm [&_h1]:font-bold",
        "[&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold",
        "[&_h3]:font-display [&_h3]:text-lg [&_h3]:font-bold",
        "[&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground",
        className,
      )}
    />
  );
}
