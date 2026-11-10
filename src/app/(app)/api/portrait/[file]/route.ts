import sharp from "sharp";

/**
 * A player cut-out trimmed to the golfer. The portraits are uploaded in all shapes (landscape,
 * square, tall) with the golfer at different sizes inside the black background, so fitting the
 * raw photo into a tile left heads at all different heights. Trimming the black away first means
 * every golfer fills the tile's width and stands on its bottom edge at the same scale.
 *
 * The file name changes whenever a photo is replaced, so the result is cached for a year at the
 * CDN and this only runs once per photo.
 */
export async function GET(request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!/^[\w.-]+\.(jpe?g|png|webp)$/i.test(file)) return new Response("Not found", { status: 404 });

  const source = await fetch(new URL(`/api/media/file/${encodeURIComponent(file)}`, request.url));
  if (!source.ok) return new Response("Not found", { status: 404 });
  const input = Buffer.from(await source.arrayBuffer());

  let output: Buffer;
  try {
    const trimmed = await sharp(input).flatten({ background: "#000000" }).trim({ background: "#000000", threshold: 40 }).toBuffer({ resolveWithObject: true });
    const w = trimmed.info.width;
    output = await sharp(trimmed.data)
      .extend({ left: Math.round(w * 0.04), right: Math.round(w * 0.04), top: Math.round(w * 0.08), bottom: 0, background: "#000000" })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    // Nothing to trim (an all-black image) or an unreadable file: serve the original as it is.
    output = input;
  }

  return new Response(new Uint8Array(output), {
    headers: {
      "Content-Type": output === input ? (source.headers.get("content-type") ?? "image/jpeg") : "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
