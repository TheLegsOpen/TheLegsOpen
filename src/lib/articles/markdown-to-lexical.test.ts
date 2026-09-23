import { describe, expect, it } from "vitest";

import { inlineNodes, markdownToLexical, readingTimeMinutes, type ElementNode } from "./markdown-to-lexical";

describe("markdownToLexical", () => {
  it("joins a hard-wrapped paragraph back into one run of text", () => {
    const doc = markdownToLexical("The fourth Legs Open was played\nin a wind that would have\njustified calling it off.");
    expect(doc.root.children).toHaveLength(1);
    const paragraph = doc.root.children[0] as ElementNode & { children: { text: string }[] };
    expect(paragraph.type).toBe("paragraph");
    expect(paragraph.children[0].text).toBe("The fourth Legs Open was played in a wind that would have justified calling it off.");
  });

  it("starts a new paragraph on a blank line", () => {
    const doc = markdownToLexical("One.\n\nTwo.");
    expect(doc.root.children.map((c) => c.type)).toEqual(["paragraph", "paragraph"]);
  });

  it("drops the h1 headline, which the article page renders from the title field", () => {
    const doc = markdownToLexical("# Clee goes back to back\n\nBody text.");
    expect(doc.root.children).toHaveLength(1);
    expect(doc.root.children[0].type).toBe("paragraph");
  });

  it("keeps section headings", () => {
    const doc = markdownToLexical("## Level after thirteen\n\nBody.");
    const heading = doc.root.children[0] as ElementNode;
    expect(heading.type).toBe("heading");
    expect(heading.tag).toBe("h2");
  });

  it("builds a bullet list", () => {
    const doc = markdownToLexical("- Clee\n- Ingram");
    const list = doc.root.children[0] as ElementNode;
    expect(list.type).toBe("list");
    expect(list.tag).toBe("ul");
    expect(list.children).toHaveLength(2);
  });

  it("leaves a paragraph that merely starts with a dash alone", () => {
    const doc = markdownToLexical("- Clee\nand then some prose that is not a list item");
    expect(doc.root.children[0].type).toBe("paragraph");
  });

  it("marks bold and italic runs", () => {
    const nodes = inlineNodes("a **three at the last** and an *eagle*");
    expect(nodes.map((n) => [n.text, n.format])).toEqual([
      ["a ", 0],
      ["three at the last", 1],
      [" and an ", 0],
      ["eagle", 2],
    ]);
  });

  it("does not mistake bold for an empty italic run", () => {
    expect(inlineNodes("**five**").map((n) => n.format)).toEqual([1]);
  });

  it("leaves an unmatched asterisk as literal text", () => {
    expect(inlineNodes("2 * 3 = 6")[0].text).toBe("2 * 3 = 6");
  });

  it("never emits an empty children array, which Lexical rejects", () => {
    const doc = markdownToLexical("## \n\ntext");
    for (const child of doc.root.children) {
      expect((child as ElementNode).children.length).toBeGreaterThan(0);
    }
  });

  it("estimates a reading time of at least a minute", () => {
    expect(readingTimeMinutes("a few words")).toBe(1);
    expect(readingTimeMinutes(Array(600).fill("word").join(" "))).toBe(3);
  });
});
