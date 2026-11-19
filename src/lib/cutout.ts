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
export async function makeCutout(input: Buffer, { frame = false }: { frame?: boolean } = {}): Promise<Buffer> {
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

  const raw = { raw: { width: info.width, height: info.height, channels: 4 as const } };
  if (frame) {
    const framing = frameByHead(data, info.width, info.height);
    if (framing) {
      const { canvas, left, top, crop } = framing;
      const figure = await sharp(data, raw).extract(crop).png().toBuffer();
      return sharp({ create: { width: canvas.width, height: canvas.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
        .composite([{ input: figure, left, top }])
        .png()
        .toBuffer()
        .then((png) => sharp(png).resize({ height: MAX_HEIGHT, withoutEnlargement: true }).webp({ quality: 85, alphaQuality: 90 }).toBuffer());
    }
  }

  return sharp(data, raw).webp({ quality: 85, alphaQuality: 90 }).toBuffer();
}

/** Head width as a share of the frame's width: the typical player's before framing existed. */
const HEAD_SHARE = 0.31;
/** The gap above the head, as a share of the frame's height. */
const TOP_GAP = 0.07;
/** The lowest a head may sit (its top, as a share of the frame's height) before the frame stops growing. */
const LOWEST_HEAD = 0.2;

/**
 * The head of a cut-out: from the top of the figure, the widest span before the neck narrows.
 * Undefined when no neck shows (a figure that never narrows below the head).
 */
export function findHead(alpha: (y: number) => [number, number] | null, width: number, height: number): { top: number; bottom: number; width: number; centreX: number } | undefined {
  let top = -1;
  for (let y = 0; y < height; y++) if (alpha(y)) { top = y; break; }
  if (top < 0) return undefined;
  const span = Math.min(height - top, Math.round(width * 0.9));
  const widths = Array.from({ length: span }, (_, i) => {
    const r = alpha(top + i);
    return r ? r[1] - r[0] : 0;
  });
  const k = Math.max(2, Math.round(width * 0.01));
  const smooth = widths.map((_, i) => {
    let sum = 0;
    let n = 0;
    for (let j = i - k; j <= i + k; j++) if (j >= 0 && j < widths.length) { sum += widths[j]; n++; }
    return sum / n;
  });
  let peak = 0;
  let peakAt = 0;
  for (let i = Math.round(width * 0.05); i < smooth.length; i++) {
    if (smooth[i] > peak) {
      peak = smooth[i];
      peakAt = i;
    } else if (smooth[i] < peak * 0.93) {
      let neck = i;
      while (neck + 1 < smooth.length && smooth[neck + 1] <= smooth[neck]) neck++;
      const r = alpha(top + peakAt);
      return { top, bottom: top + neck, width: peak, centreX: r ? (r[0] + r[1]) / 2 : width / 2 };
    }
  }
  return undefined;
}

/**
 * Where to place a cut-out on a 3:4 frame so every golfer's head comes out the same size, wherever
 * the photo was cropped. Fitting each outline to the tile instead made a golfer photographed down to
 * the thighs (Robert Hamilton) or in a wide jacket (Steven Leisegang) noticeably smaller than one
 * cropped at the chest.
 *
 * The frame is sized so the head is HEAD_SHARE of its width, centred on the head, with the body
 * standing on the bottom edge. A tall figure whose head would then poke out of the top is lowered to
 * TOP_GAP and cropped at the bottom instead. A short one (a close-up ending at the chest) would leave
 * its head low in the frame; the frame stops growing at LOWEST_HEAD rather than leaving the body
 * floating above the bottom edge, so that head stays a little bigger than the rest.
 *
 * Undefined when no head can be found, and the caller keeps the outline-fitted cut-out.
 */
export function frameByHead(px: Buffer | Uint8Array, width: number, height: number) {
  const spans: ([number, number] | null)[] = [];
  let bottom = -1;
  for (let y = 0; y < height; y++) {
    let l = -1;
    let r = -1;
    for (let x = 0; x < width; x++) if (px[(y * width + x) * 4 + 3] > 128) { if (l < 0) l = x; r = x; }
    spans.push(l < 0 ? null : [l, r]);
    if (l >= 0) bottom = y;
  }
  const head = findHead((y) => spans[y], width, height);
  if (!head || head.width < width * 0.12) return undefined;

  const figureHeight = bottom + 1 - head.top;
  // Width from the head, capped so a short figure still reaches the bottom edge with its head no lower than LOWEST_HEAD.
  const frameWidth = Math.round(Math.min(head.width / HEAD_SHARE, (figureHeight / (1 - LOWEST_HEAD)) * 0.75));
  const frameHeight = Math.round((frameWidth * 4) / 3);

  const left = Math.round(frameWidth / 2 - head.centreX);
  let top = frameHeight - (bottom + 1);
  if (top + head.top < TOP_GAP * frameHeight) top = Math.round(TOP_GAP * frameHeight - head.top);

  // The part of the figure that lands inside the frame.
  const srcLeft = Math.max(0, -left);
  const srcTop = Math.max(0, -top);
  const crop = {
    left: srcLeft,
    top: srcTop,
    width: Math.min(width - srcLeft, frameWidth - Math.max(0, left)),
    height: Math.min(height - srcTop, frameHeight - Math.max(0, top)),
  };
  if (crop.width <= 0 || crop.height <= 0) return undefined;
  return { canvas: { width: frameWidth, height: frameHeight }, left: Math.max(0, left), top: Math.max(0, top), crop, head };
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
