import sharp from "sharp";

/**
 * Prepares a player photo for the tee-time graphic.
 *
 * Satori (behind next/og) fetches and decodes images itself, but it only understands PNG, JPEG and
 * SVG -- a WebP is skipped with "Unsupported image type: image/webp" and the player simply does not
 * appear. That is not hypothetical: one of the current field's photos is a WebP and rendered as an
 * empty box, with nothing failing loudly. Rather than special-casing WebP, every photo goes through
 * sharp here, which also means:
 *
 *   - the crop is decided here rather than by objectFit, so it can be biased towards the head;
 *   - Satori receives a small image at exactly the size it draws, instead of a ~1.2MB source; and
 *   - a broken or missing photo degrades to an empty cell instead of failing the whole render.
 */

/** Bias the crop above centre -- a straight centre crop of these near-square portraits cuts the
 * top of the head off before it cuts anything unimportant. */
const CROP_POSITION = "top";

export async function preparePhoto(url: string, width: number, height: number): Promise<string | undefined> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return undefined;

    const input = Buffer.from(await res.arrayBuffer());
    const output = await sharp(input)
      .resize(Math.round(width), Math.round(height), { fit: "cover", position: CROP_POSITION })
      .jpeg({ quality: 82 })
      .toBuffer();

    return `data:image/jpeg;base64,${output.toString("base64")}`;
  } catch {
    // A single unreadable photo should cost that one cell, not the whole graphic.
    return undefined;
  }
}
