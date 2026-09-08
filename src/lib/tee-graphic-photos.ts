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

/**
 * How much of the source to keep before fitting it to the cell. These are studio-style
 * head-and-shoulders shots with a lot of empty space around the subject, so using the whole frame
 * leaves each player small in a large dark cell. Taking the middle ~76% brings them up to fill it.
 */
const ZOOM = 0.76;
/** Where the kept region starts vertically, as a fraction of the source height. Above centre --
 * (1 - ZOOM) / 2 would be centred, and these subjects sit high in frame. */
const ZOOM_TOP = 0.04;

export async function preparePhoto(url: string, width: number, height: number): Promise<string | undefined> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return undefined;

    const input = Buffer.from(await res.arrayBuffer());
    const image = sharp(input);
    const meta = await image.metadata();

    // Only zoom when the source dimensions are known; otherwise fall through to a plain cover fit.
    if (meta.width && meta.height) {
      const regionWidth = Math.round(meta.width * ZOOM);
      const regionHeight = Math.round(meta.height * ZOOM);
      const left = Math.max(0, Math.round((meta.width - regionWidth) / 2));
      const top = Math.max(0, Math.min(Math.round(meta.height * ZOOM_TOP), meta.height - regionHeight));

      const zoomed = await sharp(input)
        .extract({ left, top, width: Math.min(regionWidth, meta.width - left), height: Math.min(regionHeight, meta.height - top) })
        .resize(Math.round(width), Math.round(height), { fit: "cover", position: CROP_POSITION })
        .jpeg({ quality: 82 })
        .toBuffer();
      return `data:image/jpeg;base64,${zoomed.toString("base64")}`;
    }

    const output = await image
      .resize(Math.round(width), Math.round(height), { fit: "cover", position: CROP_POSITION })
      .jpeg({ quality: 82 })
      .toBuffer();

    return `data:image/jpeg;base64,${output.toString("base64")}`;
  } catch {
    // A single unreadable photo should cost that one cell, not the whole graphic.
    return undefined;
  }
}

/**
 * The course photo that sits behind everything, blurred back so it reads as texture rather than as
 * a picture competing with the players.
 *
 * The blur has to happen here rather than in the layout: Satori supports no CSS filters at all, so
 * `filter: blur()` would be silently ignored and the backdrop would come through sharp.
 */
export async function prepareBackground(url: string, width: number, height: number): Promise<string | undefined> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return undefined;

    const input = Buffer.from(await res.arrayBuffer());
    const output = await sharp(input)
      .resize(Math.round(width), Math.round(height), { fit: "cover", position: "centre" })
      // Heavy blur, then knocked well back in brightness and saturation. The players are the
      // subject; this only needs to stop the card being flat navy.
      .blur(26)
      .modulate({ brightness: 0.78, saturation: 0.72 })
      .jpeg({ quality: 78 })
      .toBuffer();

    return `data:image/jpeg;base64,${output.toString("base64")}`;
  } catch {
    return undefined;
  }
}

/**
 * Same idea for a logo, but fitted inside its box rather than cropped to fill it, and kept as a PNG
 * so transparency survives -- these sit on navy, and a JPEG would box them in black.
 *
 * This matters more than for photos: the sponsor mark is an SVG and the site mark a WebP, and
 * Satori decodes neither. sharp rasterises the SVG at the size asked for, so it stays sharp.
 */
export async function prepareLogo(url: string, maxWidth: number, maxHeight: number): Promise<string | undefined> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return undefined;

    const input = Buffer.from(await res.arrayBuffer());
    const output = await sharp(input)
      .resize(Math.round(maxWidth), Math.round(maxHeight), {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();

    return `data:image/png;base64,${output.toString("base64")}`;
  } catch {
    return undefined;
  }
}
