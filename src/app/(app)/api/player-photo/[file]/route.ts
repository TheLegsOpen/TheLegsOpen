import { put } from "@vercel/blob";

import { makeCutout } from "@/lib/cutout";
import { blobBaseUrl, mediaSourceUrl } from "@/lib/media-source";

/**
 * Bump when the framing in makeCutout changes, so stored copies made the old way are never served.
 * Old copies are simply left behind under their old folder.
 */
const FRAMING_VERSION = "v1";

/**
 * A player photo as a transparent cut-out framed by the head (see frameByHead in src/lib/cutout.ts):
 * a 3:4 frame in which every golfer's head is the same size and height, so the Field grid and every
 * other portrait line up however each photo was cropped. Every player portrait on the site uses it
 * (cutoutUrl); /api/cutout, the same cut-out fitted to its outline, stays for links already out there.
 *
 * Making one takes about two seconds (download, cut out, find the head, frame, encode). The CDN
 * caches the response, but Vercel adds the deployment's id to every next/image address, so after
 * each deploy every photo was requested afresh and made again -- a few seconds' wait for the photos
 * on player pages and Head-to-head. So the live site keeps each finished photo in Blob storage
 * (player-photo/<version>/<file>.webp) the first time it is made and serves that from then on, in
 * about a tenth of the time. Previews never read or write the store, so testing a framing change on a
 * branch can't put its photos in front of live visitors.
 */
export async function GET(request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!/^[\w.-]+\.(jpe?g|png|webp)$/i.test(file)) return new Response("Not found", { status: 404 });

  const live = process.env.VERCEL_ENV === "production";
  const base = blobBaseUrl();
  const storedPath = `player-photo/${FRAMING_VERSION}/${file}.webp`;

  if (live && base) {
    try {
      const stored = await fetch(`${base}/${storedPath}`);
      if (stored.ok) return imageResponse(Buffer.from(await stored.arrayBuffer()), "image/webp");
    } catch {
      // Not stored yet, or Blob unreachable: make it below.
    }
  }

  const source = await fetch(mediaSourceUrl(file, request.url));
  if (!source.ok) return new Response("Not found", { status: 404 });
  const input = Buffer.from(await source.arrayBuffer());

  let output: Buffer;
  try {
    output = await makeCutout(input, { frame: true });
  } catch {
    // Nothing to trim (an all-black image) or an unreadable file: serve the original as it is.
    return imageResponse(input, source.headers.get("content-type") ?? "image/jpeg");
  }

  if (live && base) {
    // Best effort: a failed save only means the next request makes it again.
    try {
      await put(storedPath, output, { access: "public", contentType: "image/webp", addRandomSuffix: false, allowOverwrite: true });
    } catch (err) {
      console.error("player-photo: could not store", storedPath, err);
    }
  }

  return imageResponse(output, "image/webp");
}

function imageResponse(body: Buffer, contentType: string) {
  return new Response(new Uint8Array(body), {
    headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
