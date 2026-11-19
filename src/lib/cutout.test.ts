import { describe, expect, it } from "vitest";

import { clearBackdrop, frameByHead } from "@/lib/cutout";

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

/** A W x H RGBA figure: a round head of the given width on top of shoulders that fill the width. */
function figure(width: number, height: number, headWidth: number): Uint8Array {
  const px = new Uint8Array(width * height * 4);
  const r = headWidth / 2;
  const cx = width / 2;
  const cy = r + 2;
  const neckTop = Math.round(cy + r * 0.9);
  const shoulders = Math.round(cy + r * 1.6);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const inHead = (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
      const inNeck = y >= neckTop && y < shoulders && Math.abs(x - cx) < r * 0.45;
      const inBody = y >= shoulders;
      if (inHead || inNeck || inBody) px[(y * width + x) * 4 + 3] = 255;
    }
  return px;
}

describe("frameByHead", () => {
  it("frames every golfer with the head the same share of a 3:4 frame", () => {
    for (const [w, h, head] of [[300, 600, 80], [300, 420, 110]]) {
      const f = frameByHead(figure(w, h, head), w, h)!;
      expect(f).toBeDefined();
      expect(f.canvas.height / f.canvas.width).toBeCloseTo(4 / 3, 1);
      expect(f.head.width / f.canvas.width).toBeGreaterThan(0.28);
      expect(f.head.width / f.canvas.width).toBeLessThan(0.4);
    }
  });

  it("keeps the head off the top edge of a tall figure", () => {
    const f = frameByHead(figure(300, 900, 80), 300, 900)!;
    expect(f.top + f.head.top).toBeGreaterThanOrEqual(Math.floor(0.07 * f.canvas.height) - 1);
  });

  it("gives up on a figure with no neck, leaving the cut-out as it was", () => {
    const block = new Uint8Array(100 * 100 * 4).fill(255);
    expect(frameByHead(block, 100, 100)).toBeUndefined();
  });
});
