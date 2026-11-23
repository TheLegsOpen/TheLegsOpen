import { describe, expect, it } from "vitest";

import { extremeHoles, holeList } from "@/lib/course-guide-extremes";
import { ordinal } from "@/lib/utils";

describe("extremeHoles", () => {
  it("names every hole tied at the two decimal places the page shows", () => {
    const holes = [
      { holeNumber: 1, par: 4, average: 6.36 },
      { holeNumber: 2, par: 4, average: 4.5555 },
      { holeNumber: 3, par: 3, average: 3.5649 },
      { holeNumber: 4, par: 5, average: 5.9 },
    ];
    expect(extremeHoles(holes)).toEqual({ hardest: [1], easiest: [2, 3] });
  });

  it("ignores holes with no average and returns nothing for an unplayed course", () => {
    expect(extremeHoles([{ holeNumber: 1, par: 4 }])).toEqual({ hardest: [], easiest: [] });
    expect(extremeHoles([{ holeNumber: 1, par: 4 }, { holeNumber: 2, par: 3, average: 4 }])).toEqual({ hardest: [2], easiest: [2] });
  });
});

describe("holeList", () => {
  it("joins one, two or three holes", () => {
    expect(holeList([7], ordinal)).toBe("the 7th");
    expect(holeList([16, 17], ordinal)).toBe("the 16th and 17th");
    expect(holeList([1, 2, 3], ordinal)).toBe("the 1st, 2nd and 3rd");
  });
});
