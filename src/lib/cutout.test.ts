import { describe, expect, it } from "vitest";

import { clearBackdrop } from "@/lib/cutout";

/** A 5x5 RGBA image: black backdrop, with a 3x3 block of `inner` grey in the middle. */
function image(inner: number, centre = inner): Uint8Array {
  const px = new Uint8Array(5 * 5 * 4);
  for (let y = 0; y < 5; y++)
    for (let x = 0; x < 5; x++) {
      const o = (y * 5 + x) * 4;
      const v = x >= 1 && x <= 3 && y >= 1 && y <= 3 ? (x === 2 && y === 2 ? centre : inner) : 0;
      px.set([v, v, v, 255], o);
    }
  return px;
}
const alphaAt = (px: Uint8Array, x: number, y: number) => px[(y * 5 + x) * 4 + 3];

describe("clearBackdrop", () => {
  it("makes the black backdrop fully transparent", () => {
    const px = image(200);
    clearBackdrop(px, 5, 5);
    expect(alphaAt(px, 0, 0)).toBe(0);
    expect(alphaAt(px, 4, 2)).toBe(0);
  });

  it("keeps the golfer solid, even a dark shirt the backdrop can't reach", () => {
    // The 200 ring is the edge the backdrop touches and fades; the dark centre is enclosed by it.
    const px = image(200, 10);
    clearBackdrop(px, 5, 5);
    expect(alphaAt(px, 2, 2)).toBe(255);
  });

  it("fades only the ring of pixels next to the backdrop, in proportion to brightness", () => {
    const px = image(102);
    clearBackdrop(px, 5, 5);
    expect(alphaAt(px, 1, 1)).toBe(102);
    expect(px[(1 * 5 + 1) * 4]).toBe(255);
    expect(alphaAt(px, 2, 2)).toBe(255);
  });

  it("lets a dark area joined to the backdrop go see-through, as the screen blend did", () => {
    const px = image(20);
    clearBackdrop(px, 5, 5);
    expect(alphaAt(px, 2, 2)).toBe(20);
  });
});
