import { describe, expect, it } from "vitest";

import { ARTICLE_SOURCES } from "@/content/articles";
import { markdownToLexical } from "@/lib/articles/markdown-to-lexical";

/**
 * A write-up is only ever converted at publish time, inside an authenticated route that nobody
 * runs often -- so a Markdown file that converts to nothing, or a slug typed twice over an
 * existing article, would otherwise be found by publishing it over the top of something.
 */
describe("registered championship write-ups", () => {
  it("have unique slugs", () => {
    const slugs = ARTICLE_SOURCES.map((source) => source.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("are each dated to the championship year they report", () => {
    for (const source of ARTICLE_SOURCES) {
      if (!source.championshipYear) continue;
      expect(new Date(source.publishedAt).getUTCFullYear(), source.slug).toBe(source.championshipYear);
    }
  });

  for (const source of ARTICLE_SOURCES) {
    it(`${source.slug} converts to a real article body`, () => {
      const blocks = markdownToLexical(source.markdown).root.children;
      expect(blocks.filter((node) => node.type === "heading").length).toBeGreaterThan(1);
      expect(blocks.filter((node) => node.type === "paragraph").length).toBeGreaterThan(4);
    });
  }
});
