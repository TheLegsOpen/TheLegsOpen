import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import sharp from "sharp";

import configPromise from "@/payload.config";

/**
 * Re-encodes PNG photographs in the Media library as JPEG, in place.
 *
 * Roughly two thirds of the library is photographs stored as PNG -- 94 files, 123 MB of 145 MB.
 * None of that reaches a visitor: next/image re-encodes every raster to AVIF or WebP at quality
 * 75 before serving it, whatever the source format, so the bytes on the wire are identical either
 * way. What it costs is blob storage, admin list pages that load a hundred-odd multi-megabyte
 * thumbnails, and the size of every backup. PNG is lossless, so a JPEG at quality 90 made from one
 * discards nothing anybody can see, and it is then re-encoded anyway.
 *
 * The file is replaced ON THE EXISTING media record, so every article, player, venue and global
 * that points at it keeps working -- references are by id, not by filename.
 *
 * Open it in a browser already signed in to the admin; it authenticates on that session, the same
 * way /api/admin-article does.
 *
 *   /api/admin-media                                  what is eligible, and what it weighs
 *   /api/admin-media?convert                          dry run: convert in memory, report savings
 *   /api/admin-media?convert&confirm=CONVERT          write them
 *   /api/admin-media?convert&id=123                   dry run one file
 *   /api/admin-media?convert&confirm=CONVERT&limit=5  write at most five
 *
 * Converted files stop being PNGs, so re-running simply picks up whatever is left -- the job is
 * resumable by repeating the same URL until it reports nothing remaining. That matters because a
 * serverless function has a time limit and this downloads, decodes and re-uploads every file.
 *
 * TWO THINGS IT REFUSES TO TOUCH, both checked per file rather than assumed:
 *
 *   1. A PNG using real transparency. Logos, the champion badge, the clock hands and the trophy
 *      graphic all need their alpha channel; flattening them onto white would wreck them. Having
 *      an alpha channel is not enough to tell -- plenty of opaque PNGs carry an unused one -- so
 *      this reads the actual minimum alpha value and only converts when every pixel is opaque.
 *   2. A file where the JPEG comes out no smaller. Rare, but there is no reason to rewrite a
 *      record to make it worse.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const QUALITY = 90;
const DEFAULT_LIMIT = 8;

type Outcome = {
  id: number | string;
  filename: string;
  pixels?: string;
  was?: string;
  now?: string;
  saved?: string;
  status: string;
};

const kb = (bytes: number) => `${(bytes / 1024).toFixed(0)} KB`;
const mb = (bytes: number) => `${(bytes / 1048576).toFixed(2)} MB`;

export async function GET(request: NextRequest) {
  const payload = await getPayload({ config: configPromise });
  const { user } = await payload.auth({ headers: request.headers });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized -- open this while signed in to the admin" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const convert = params.has("convert");
  const confirmed = params.get("confirm") === "CONVERT";
  const onlyId = params.get("id");
  const limit = Number(params.get("limit")) || DEFAULT_LIMIT;

  const all = await payload.find({ collection: "media", limit: 1000, depth: 0, pagination: false });
  const pngs = all.docs
    .filter((doc) => doc.mimeType === "image/png")
    .filter((doc) => (onlyId ? String(doc.id) === onlyId : true))
    // Oldest first, so repeated runs work through the library in a stable order rather than
    // revisiting whatever the database felt like returning first.
    .sort((a, b) => Number(a.id) - Number(b.id));

  if (!convert) {
    const bytes = pngs.reduce((sum, doc) => sum + (doc.filesize ?? 0), 0);
    const libraryBytes = all.docs.reduce((sum, doc) => sum + (doc.filesize ?? 0), 0);
    return NextResponse.json({
      library: { files: all.docs.length, size: mb(libraryBytes) },
      pngs: { files: pngs.length, size: mb(bytes) },
      note: "Transparency is checked per file during the run, so some of these will be skipped.",
      usage: {
        dryRun: "/api/admin-media?convert",
        oneFile: "/api/admin-media?convert&id=<media id>",
        apply: "/api/admin-media?convert&confirm=CONVERT",
      },
    });
  }

  const batch = pngs.slice(0, limit);
  const results: Outcome[] = [];
  let before = 0;
  let after = 0;
  let written = 0;

  for (const doc of batch) {
    const filename = doc.filename ?? String(doc.id);
    const out: Outcome = { id: doc.id, filename, status: "" };

    try {
      if (!doc.url) {
        out.status = "skipped -- no url on the record";
        results.push(out);
        continue;
      }
      // doc.url is site-relative (/api/media/file/...), so it needs an origin to be fetchable
      // from inside the function.
      const absolute = doc.url.startsWith("http") ? doc.url : `${request.nextUrl.origin}${doc.url}`;
      const response = await fetch(absolute);
      if (!response.ok) {
        out.status = `skipped -- could not fetch original (HTTP ${response.status})`;
        results.push(out);
        continue;
      }
      const original = Buffer.from(await response.arrayBuffer());
      const meta = await sharp(original).metadata();
      out.pixels = `${meta.width}×${meta.height}`;
      out.was = kb(original.length);

      // An alpha channel is not the same as transparency. Read the channel's actual minimum:
      // 255 everywhere means fully opaque and safe to flatten away.
      if (meta.hasAlpha) {
        const stats = await sharp(original).stats();
        const alpha = stats.channels[stats.channels.length - 1];
        if (alpha && alpha.min < 255) {
          out.status = "kept as PNG -- uses real transparency";
          results.push(out);
          continue;
        }
      }

      const jpeg = await sharp(original).flatten({ background: "#ffffff" }).jpeg({ quality: QUALITY, mozjpeg: true }).toBuffer();
      out.now = kb(jpeg.length);

      if (jpeg.length >= original.length) {
        out.status = "kept as PNG -- JPEG came out no smaller";
        results.push(out);
        continue;
      }

      before += original.length;
      after += jpeg.length;
      out.saved = `${Math.round((1 - jpeg.length / original.length) * 100)}%`;

      if (!confirmed) {
        out.status = "would convert";
        results.push(out);
        continue;
      }

      const name = filename.replace(/\.png$/i, "") + ".jpg";
      await payload.update({
        collection: "media",
        id: doc.id,
        // Nothing in `data`: alt and every other field stay exactly as they are. Only the file
        // behind the record changes.
        data: {},
        file: { data: jpeg, mimetype: "image/jpeg", name, size: jpeg.length },
      });
      written += 1;
      out.status = `converted -> ${name}`;
      results.push(out);
    } catch (err) {
      out.status = `FAILED -- ${err instanceof Error ? err.message : "unknown error"}`;
      results.push(out);
    }
  }

  const remaining = pngs.length - batch.length;
  return NextResponse.json({
    mode: confirmed ? "applied" : "dry run",
    message: confirmed
      ? `${written} file(s) rewritten.`
      : "Nothing written. Add &confirm=CONVERT to apply.",
    batch: `${batch.length} of ${pngs.length} eligible PNG(s)`,
    saving: before ? `${mb(before)} -> ${mb(after)} (${Math.round((1 - after / before) * 100)}% smaller)` : "nothing to save in this batch",
    remainingAfterThisRun: confirmed ? remaining : pngs.length,
    next:
      confirmed && remaining > 0
        ? `Run the same URL again -- converted files are no longer PNGs, so it picks up the next ${Math.min(limit, remaining)}.`
        : undefined,
    results,
  });
}
