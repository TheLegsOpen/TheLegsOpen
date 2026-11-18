import sharp from "sharp";

/** Tall enough for the largest place a cut-out is shown, small enough to keep the pixel pass quick. */
const MAX_HEIGHT = 1400;
/** A pixel this dark (its brightest channel, 0-255) and touching the edge is backdrop, not golfer. */
const BACKDROP = 32;

/**
 * A player photo as a transparent cut-out, trimmed to the golfer -- for placing over a picture
 * (the Field grid's landscape) rather than over flat navy.
 *
 * Two kinds of upload arrive. A real cut-out (a PNG with a transparent background) is trimmed to
 * its transparency and otherwise left alone. The rest are photos on a black backdrop: there the
 * black is flooded in from the edges, and only what it reaches is made see-through, in proportion
 * to how dark it is -- the same thing the screen blend did to the whole photo. The golfer's own
 * shirt and face stay solid, so the picture behind doesn't show through them. Dark hair or a black
 * jumper that runs unbroken into the backdrop is reached by the flood and still goes faint, which
 * only a proper cut-out avoids.
 */
export async function makeCutout(input: Buffer): Promise<Buffer> {
  const { isOpaque } = await sharp(input).stats();

  const trimmed = isOpaque
    ? await sharp(input).flatten({ background: "#000000" }).trim({ background: "#000000", threshold: 40 }).toBuffer({ resolveWithObject: true })
    : await sharp(input).ensureAlpha().trim({ threshold: 10 }).toBuffer({ resolveWithObject: true });

  // Same margins as /api/portrait, so a golfer stands at the same size in either.
  const w = trimmed.info.width;
  const { data, info } = await sharp(trimmed.data)
    .ensureAlpha()
    .extend({ left: Math.round(w * 0.04), right: Math.round(w * 0.04), top: Math.round(w * 0.08), bottom: 0, background: { r: 0, g: 0, b: 0, alpha: isOpaque ? 1 : 0 } })
    .resize({ height: MAX_HEIGHT, withoutEnlargement: true })
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (isOpaque) clearBackdrop(data, info.width, info.height);

  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).webp({ quality: 85, alphaQuality: 90 }).toBuffer();
}

/**
 * Floods the dark backdrop in from the left, right and top edges (the golfer stands on the
 * bottom one, so it isn't a starting point) and gives every pixel it reaches an alpha equal to its
 * brightness, un-darkening its colour to match -- black goes fully clear, a dim edge pixel stays
 * faintly visible. Works in place on 4-channel raw pixels.
 */
export function clearBackdrop(px: Buffer | Uint8Array, width: number, height: number): void {
  const seen = new Uint8Array(width * height);
  const stack: number[] = [];
  const brightness = (i: number) => Math.max(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]);
  const push = (i: number) => {
    if (!seen[i] && brightness(i) < BACKDROP) {
      seen[i] = 1;
      stack.push(i);
    }
  };

  for (let x = 0; x < width; x++) push(x);
  for (let y = 0; y < height; y++) {
    push(y * width);
    push(y * width + width - 1);
  }

  while (stack.length) {
    const i = stack.pop()!;
    const x = i % width;
    if (x > 0) push(i - 1);
    if (x < width - 1) push(i + 1);
    if (i >= width) push(i - width);
    if (i < width * (height - 1)) push(i + width);
  }

  // The flood stops at the first pixel brighter than BACKDROP, which leaves the soft edge of hair
  // and shoulders as a dark rim. Fade one more ring of pixels next to the backdrop the same way.
  const rim = new Uint8Array(width * height);
  for (let i = 0; i < seen.length; i++) {
    if (seen[i]) continue;
    const x = i % width;
    if ((x > 0 && seen[i - 1]) || (x < width - 1 && seen[i + 1]) || (i >= width && seen[i - width]) || (i < width * (height - 1) && seen[i + width])) rim[i] = 1;
  }

  for (let i = 0; i < seen.length; i++) {
    if (!seen[i] && !rim[i]) continue;
    const o = i * 4;
    const a = brightness(i);
    if (a === 0) {
      px[o + 3] = 0;
      continue;
    }
    px[o] = Math.round((px[o] * 255) / a);
    px[o + 1] = Math.round((px[o + 1] * 255) / a);
    px[o + 2] = Math.round((px[o + 2] * 255) / a);
    px[o + 3] = a;
  }
}
