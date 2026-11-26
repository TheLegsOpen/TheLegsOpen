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
    // A year with a gross eagle, so the scratch eagles card is in.
    all.find((c) => c.key === "most-eagles-or-better-scratch")!.rows.push({ player: { id: "p" } as StatCategory["rows"][number]["player"], value: 1, display: "1" });
    expect(previewCategories(all, "scratch").map((c) => c.key)).toEqual([
      "strokes-gained-scratch", "best-front-9-scratch", "best-back-9-scratch", "most-birdies-or-better-scratch",
      "birdie-or-better-percentage-scratch", "bogey-avoidance-scratch", "bounce-back-scratch", "most-eagles-or-better-scratch",
    ]);
  });
});

describe("previewCategories, eagles", () => {
  const withRows = (key: string, n: number): StatCategory => ({ ...category(key), rows: Array.from({ length: n }, () => ({ player: { id: "p" } as StatCategory["rows"][number]["player"], value: 1, display: "1" })) });

  it("leaves out the scratch eagles card in a year with no gross eagle, and keeps it when there is one", () => {
    expect(previewCategories([withRows("most-eagles-or-better-scratch", 0)], "scratch")).toEqual([]);
    expect(previewCategories([withRows("most-eagles-or-better-scratch", 1)], "scratch")).toHaveLength(1);
  });

  it("keeps the nett eagles card either way", () => {
    expect(previewCategories([withRows("most-eagles-or-better-nett", 0)], "nett")).toHaveLength(1);
  });
});
