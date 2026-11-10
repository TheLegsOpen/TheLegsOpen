import { RichText } from "@payloadcms/richtext-lexical/react";

import { cn } from "@/lib/utils";

/**
 * Renders a Lexical richText field with real formatting -- lists, links, bold/italic, and line
 * breaks all survive, unlike the old lexicalToPlainParagraphs approach (see src/lib/lexical.ts),
 * which flattened every node down to plain text and silently dropped linebreak nodes entirely.
 * That's what produced a genuinely broken-looking page for any content using a manual list (see
 * the roll-of-honour article) -- Payload's own RichText/defaultJSXConverters handles every node
 * type the editor's toolbar actually offers, so anything an admin formats in the editor now
 * survives to the live page. Shared by every richText field on the site (article bodies, player
 * bios, legal pages, homepage rich-text sections) rather than each having its own flattening logic.
 */
interface LexicalNode {
  type?: string;
  text?: string;
  children?: LexicalNode[];
}

/** A paragraph with nothing in it but spaces and line breaks -- what pressing Enter twice leaves. */
function isBlankParagraph(node: LexicalNode): boolean {
  if (node.type !== "paragraph") return false;
  return (node.children ?? []).every((child) => child.type === "linebreak" || (child.type === "text" && !(child.text ?? "").trim()));
}

/**
 * Drops blank paragraphs from the top level of a Lexical document, for display only -- the stored
 * text is untouched. In the admin editor an empty line between paragraphs is a whole extra
 * paragraph, and on the page each one added a full gap on top of the normal paragraph spacing
 * (the Craigtoun announcement had several).
 */
function withoutBlankParagraphs(data: unknown): unknown {
  const root = (data as { root?: LexicalNode } | null)?.root;
  if (!root?.children) return data;
  return { ...(data as object), root: { ...root, children: root.children.filter((node) => !isBlankParagraph(node)) } };
}

export function RichTextBlock({ data, className, dropBlankParagraphs = false }: { data: unknown; className?: string; dropBlankParagraphs?: boolean }) {
  return (
    <RichText
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data={(dropBlankParagraphs ? withoutBlankParagraphs(data) : data) as any}
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
