interface LexicalNode {
  type: string;
  text?: string;
  children?: LexicalNode[];
}

function extractText(node: LexicalNode): string {
  if (node.type === "text") return node.text ?? "";
  if (node.children) return node.children.map(extractText).join("");
  return "";
}

/** Reconstructs plain paragraph strings from a Lexical richText field's serialized state. */
export function lexicalToPlainParagraphs(doc: unknown): string[] {
  if (!doc || typeof doc !== "object" || !("root" in doc)) return [];
  const root = (doc as { root?: { children?: LexicalNode[] } }).root;
  if (!root?.children) return [];
  return root.children.map(extractText).filter((text) => text.length > 0);
}

/** Builds a minimal valid Lexical richText document from plain paragraph strings — the inverse of lexicalToPlainParagraphs. */
export function plainParagraphsToLexical(paragraphs: string[]) {
  return {
    root: {
      type: "root",
      direction: "ltr" as const,
      format: "" as const,
      indent: 0,
      version: 1,
      children: paragraphs.map((text) => ({
        type: "paragraph",
        direction: "ltr" as const,
        format: "" as const,
        indent: 0,
        version: 1,
        children: [{ type: "text", text, format: 0, detail: 0, mode: "normal", style: "", version: 1 }],
      })),
    },
  };
}
