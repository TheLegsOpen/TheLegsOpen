import { describe, expect, it } from "vitest";

import { previewCategories, type StatCategory } from "@/lib/statistics";

const category = (key: string): StatCategory => ({ key, title: key, columnLabel: "", rows: [] });

describe("previewCategories", () => {
  it("keeps the eight headline scoring stats, in the preview order, for either mode", () => {
    const all = [
      "best-front-9-scratch", "best-back-9-scratch", "par-3-scoring-scratch", "most-birdies-or-better-scratch", "most-pars-scratch",
      "bounce-back-scratch", "reverse-bounce-back-scratch", "birdie-or-better-percentage-scratch", "bogey-avoidance-scratch",
      "most-eagles-or-better-scratch", "holes-per-eagle-scratch", "strokes-gained-scratch",
    ].map(category);
    expect(previewCategories(all, "scratch").map((c) => c.key)).toEqual([
      "strokes-gained-scratch", "best-front-9-scratch", "best-back-9-scratch", "most-birdies-or-better-scratch",
      "birdie-or-better-percentage-scratch", "bogey-avoidance-scratch", "bounce-back-scratch", "most-eagles-or-better-scratch",
    ]);
  });
});
