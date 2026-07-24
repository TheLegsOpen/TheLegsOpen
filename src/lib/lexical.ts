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
