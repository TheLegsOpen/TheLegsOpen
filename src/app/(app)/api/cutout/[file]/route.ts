import { makeCutout } from "@/lib/cutout";

/**
 * A player photo as a transparent cut-out (see src/lib/cutout.ts) -- the Field grid stands its
 * golfers on a landscape, which needs real transparency rather than /api/portrait's black
 * backdrop and screen blend. Everywhere that sits a portrait on flat navy still uses /api/portrait.
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
    output = await makeCutout(input);
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
