import { mediaSourceUrl } from "@/lib/media-source";
import { makeCutout } from "@/lib/cutout";

/**
 * A player photo as a transparent cut-out framed by the head (see frameByHead in src/lib/cutout.ts):
 * a 3:4 frame in which every golfer's head is the same size and height, so the Field grid and every
 * other portrait line up however each photo was cropped. Every player portrait on the site uses it
 * (cutoutUrl); /api/cutout, the same cut-out fitted to its outline, stays for links already out there.
 *
 * The file name changes whenever a photo is replaced, so the result is cached for a year at the
 * CDN and this only runs once per photo.
 */
export async function GET(request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!/^[\w.-]+\.(jpe?g|png|webp)$/i.test(file)) return new Response("Not found", { status: 404 });

  const source = await fetch(mediaSourceUrl(file, request.url));
  if (!source.ok) return new Response("Not found", { status: 404 });
  const input = Buffer.from(await source.arrayBuffer());

  let output: Buffer;
  try {
    output = await makeCutout(input, { frame: true });
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
