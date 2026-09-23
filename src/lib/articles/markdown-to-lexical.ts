/**
 * Turns a small, deliberate subset of Markdown into the Lexical document a Payload richText field
 * stores.
 *
 * Article bodies aren't text on this site -- they're a tree of typed nodes, which is why a written
 * piece can't simply be pasted into the database the way a title or a dek can. Writing that tree by
 * hand is miserable and error-prone, so the backdating write-ups are authored as Markdown (see
 * src/content/articles) and converted here.
 *
 * The subset is exactly what the site's renderer (src/components/shared/rich-text.tsx) already
 * styles and no more: paragraphs, `##` section headings, `-` bullet lists, and inline `**bold**`
 * and `*italic*`. Anything else is left as literal text rather than silently dropped -- a stray
 * `> quote` will look wrong on the page, which is a far better failure than vanishing.
 *
 * Source paragraphs may be hard-wrapped; a single newline inside a paragraph is joined with a
 * space, and a blank line starts a new one.
 */

const BOLD = 1;
const ITALIC = 2;

interface TextNode {
  type: "text";
  text: string;
  format: number;
  detail: 0;
  mode: "normal";
  style: "";
  version: 1;
}

export interface ElementNode {
  type: string;
  version: 1;
  format: "";
  indent: 0;
  direction: "ltr";
  children: (TextNode | ElementNode)[];
  /** h2/h3 on a heading, ul on a list. */
  tag?: string;
  listType?: string;
  start?: number;
  value?: number;
  textFormat?: number;
  textStyle?: string;
}

export interface LexicalDocument {
  root: Omit<ElementNode, "children" | "type"> & { type: "root"; children: ElementNode[] };
}

function text(value: string, format = 0): TextNode {
  return { type: "text", text: value, format, detail: 0, mode: "normal", style: "", version: 1 };
}

function element(type: string, children: (TextNode | ElementNode)[], extra: Record<string, unknown> = {}): ElementNode {
  return { type, version: 1, format: "", indent: 0, direction: "ltr", children, ...extra };
}

/**
 * Splits a line into text runs, honouring `**bold**` and `*italic*`.
 *
 * Bold is matched first and consumes its own delimiters, so `**word**` can't be mistaken for an
 * italic run wrapping an empty one. Unmatched markers stay as literal asterisks.
 */
export function inlineNodes(line: string): TextNode[] {
  const nodes: TextNode[] = [];
  const pattern = /\*\*([^*]+)\*\*|\*([^*]+)\*|_([^_]+)_/g;
  let cursor = 0;

  for (let match = pattern.exec(line); match !== null; match = pattern.exec(line)) {
    if (match.index > cursor) nodes.push(text(line.slice(cursor, match.index)));
    if (match[1] !== undefined) nodes.push(text(match[1], BOLD));
    else nodes.push(text((match[2] ?? match[3]) as string, ITALIC));
    cursor = match.index + match[0].length;
  }

  if (cursor < line.length) nodes.push(text(line.slice(cursor)));
  return nodes.length > 0 ? nodes : [text("")];
}

export function markdownToLexical(markdown: string): LexicalDocument {
  const children: ElementNode[] = [];
  // A blank line ends whatever was being collected; everything else accumulates into the block it
  // belongs to, so a hard-wrapped paragraph arrives here as one run of lines.
  const blocks = markdown.replace(/\r\n/g, "\n").split(/\n{2,}/);

  for (const raw of blocks) {
    const block = raw.trim();
    if (!block) continue;

    const lines = block.split("\n").map((line) => line.trim());

    // A bullet list: every line has to be one, otherwise it's a paragraph that happens to start
    // with a dash and should be left alone.
    if (lines.every((line) => /^[-*]\s+/.test(line))) {
      children.push(
        element(
          "list",
          lines.map((line, index) =>
            element("listitem", inlineNodes(line.replace(/^[-*]\s+/, "")), { value: index + 1 }),
          ),
          { listType: "bullet", tag: "ul", start: 1 },
        ),
      );
      continue;
    }

    // A heading is a block of a single line. A `#` followed by prose on the next line is a
    // paragraph that happens to start with a hash, and gets left alone.
    const heading = lines.length === 1 ? lines[0].match(/^(#{1,3})\s+(.*)$/) : null;
    if (heading) {
      // `#` is the piece's own headline, which the article page renders from the title field --
      // emitting it again would print the headline twice. Everything below it is a real section.
      const level = heading[1].length;
      if (level === 1) continue;
      children.push(element("heading", inlineNodes(heading[2]), { tag: `h${level}` }));
      continue;
    }

    children.push(element("paragraph", inlineNodes(lines.join(" ")), { textFormat: 0, textStyle: "" }));
  }

  return {
    root: { type: "root", version: 1, format: "", indent: 0, direction: "ltr", children },
  };
}

/** Rough reading time, for the field the Articles collection requires. 200 words a minute. */
export function readingTimeMinutes(markdown: string): number {
  const words = markdown.replace(/[#*_>-]/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
