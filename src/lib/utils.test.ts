import { describe, expect, it } from "vitest";

import { hexToHslTriplet } from "@/lib/utils";

/** What the browser renders a `hsl(<triplet>)` back as, so a round trip can be asserted. */
function hslTripletToHex(triplet: string): string {
  const [h, s, l] = triplet.replace(/%/g, "").split(" ").map(Number);
  const sat = s / 100;
  const lum = l / 100;
  const c = (1 - Math.abs(2 * lum - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lum - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return "#" + [r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
}

describe("hexToHslTriplet", () => {
  // The theme stores colours as hex but the CSS variables are HSL triplets, so every branding
  // colour makes this round trip on every render. Rounding the hue to a whole number used to lose
  // a point of green: #FFB800 came back as #FFB700, and The Open's #FFBA00 would have come back
  // as #FFBB00 -- a colour nobody chose.
  it.each([
    ["#FFBA00", "the accent, matched to theopen.com"],
    ["#FFB800", "the accent before it"],
    ["#06051E", "the primary"],
    ["#FFFFFF", "white"],
    ["#000000", "black"],
    ["#D4062D", "live red"],
    ["#2269AB", "CTA blue"],
    ["#38354A", "section band"],
  ])("survives the round trip: %s (%s)", (hex) => {
    expect(hslTripletToHex(hexToHslTriplet(hex))).toBe(hex);
  });

  it("expands three-character hex", () => {
    expect(hexToHslTriplet("#fff")).toBe(hexToHslTriplet("#ffffff"));
  });

  it("accepts a missing leading hash", () => {
    expect(hexToHslTriplet("FFBA00")).toBe(hexToHslTriplet("#FFBA00"));
  });

  it("emits greys with no hue or saturation", () => {
    expect(hexToHslTriplet("#808080")).toBe("0 0% 50.2%");
  });
});
