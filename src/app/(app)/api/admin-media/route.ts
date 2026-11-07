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
 *   /api/admin-media?delete&ids=13,14                 dry run: what deleting those would do
 *   /api/admin-media?delete&ids=13,14&confirm=DELETE  delete them, permanently
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

/**
 * Every place in the database that points at one of these media ids.
 *
 * Deleting an upload is the one thing here that cannot be undone, so this does not take an
 * outside caller's word that a file is unused -- it re-derives that from the database at the
 * moment of deletion, and anything that turns out to be referenced is refused.
 *
 * Everything is read at depth 1, which turns an upload field from a bare id into the populated
 * media document. That matters: at depth 0 the only thing to match on is a number, and a number
 * on some unrelated field (readTimeMinutes: 4 against media id 4) would read as a reference.
 * A populated upload is unmistakable -- it carries both a filename and a mimeType -- so this
 * walks every value of every document and every global and looks for exactly that shape, rather
 * than guessing from field names. New fields are therefore covered automatically.
 */
async function findReferences(
  payload: Awaited<ReturnType<typeof getPayload>>,
  ids: Set<number>,
): Promise<Map<number, string[]>> {
  const hits = new Map<number, string[]>();
  const note = (id: number, where: string) => {
    if (!ids.has(id)) return;
    if (!hits.has(id)) hits.set(id, []);
    if (!hits.get(id)!.includes(where)) hits.get(id)!.push(where);
  };

  const walk = (node: unknown, where: string, seen = new Set<unknown>()) => {
    if (!node || typeof node !== "object" || seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) {
      node.forEach((item) => walk(item, where, seen));
      return;
    }
    const rec = node as Record<string, unknown>;
    if (typeof rec.id === "number" && typeof rec.filename === "string" && typeof rec.mimeType === "string") {
      note(rec.id, where);
      return;
    }
    Object.values(rec).forEach((value) => walk(value, where, seen));
  };

  const config = await payload.config;

  for (const collection of config.collections) {
    if (collection.slug === "media") continue;
    const result = await payload.find({
      collection: collection.slug as "articles",
      limit: 2000,
      depth: 1,
      pagination: false,
      // Drafts count. An image used only by an unpublished article is still in use.
      ...(collection.versions && typeof collection.versions === "object" && collection.versions.drafts ? { draft: true } : {}),
    });
    result.docs.forEach((doc) => walk(doc, `${collection.slug} #${doc.id}`));
  }

  for (const global of config.globals) {
    const doc = await payload.findGlobal({ slug: global.slug as "site-theme", depth: 1 });
    walk(doc, `global: ${global.slug}`);
  }

  return hits;
}

export async function GET(request: NextRequest) {
  const payload = await getPayload({ config: configPromise });
  const { user } = await payload.auth({ headers: request.headers });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized -- open this while signed in to the admin" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;

  // ?delete -- permanent, so it re-proves each file is unreferenced before removing it and
  // refuses the whole request if any one of them is not.
  if (params.has("delete")) {
    const ids = (params.get("ids") ?? "")
      .split(",")
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value) && value > 0);
    if (!ids.length) {
      return NextResponse.json({ error: "Pass ids, e.g. ?delete&ids=13,14,16" }, { status: 400 });
    }

    const wanted = new Set(ids);
    const docs = await payload.find({
      collection: "media",
      where: { id: { in: ids } },
      limit: 500,
      depth: 0,
      pagination: false,
    });
    const found = new Map(docs.docs.map((doc) => [Number(doc.id), doc]));
    const missing = ids.filter((id) => !found.has(id));
    const references = await findReferences(payload, wanted);

    const blocked = ids.filter((id) => references.has(id));
    const deletable = ids.filter((id) => found.has(id) && !references.has(id));

    if (blocked.length) {
      return NextResponse.json(
        {
          error: "Refused -- some of these are still in use. Nothing was deleted.",
          inUse: blocked.map((id) => ({ id, filename: found.get(id)?.filename, usedBy: references.get(id) })),
        },
        { status: 409 },
      );
    }

    const bytes = deletable.reduce((sum, id) => sum + (found.get(id)?.filesize ?? 0), 0);
    const listing = deletable.map((id) => ({ id, filename: found.get(id)?.filename, size: kb(found.get(id)?.filesize ?? 0) }));

    if (params.get("confirm") !== "DELETE") {
      return NextResponse.json({
        mode: "dry run",
        message: "Nothing deleted. Add &confirm=DELETE to remove these permanently.",
        checked: `${ids.length} id(s); none is referenced by any collection, global or article body`,
        wouldDelete: listing,
        frees: mb(bytes),
        ...(missing.length ? { notFound: missing } : {}),
      });
    }

    const deleted: typeof listing = [];
    const failed: { id: number; error: string }[] = [];
    for (const id of deletable) {
      try {
        await payload.delete({ collection: "media", id });
        deleted.push(listing.find((row) => row.id === id)!);
      } catch (err) {
        failed.push({ id, error: err instanceof Error ? err.message : "unknown" });
      }
    }
    return NextResponse.json({
      mode: "applied",
      message: `${deleted.length} file(s) deleted. This cannot be undone.`,
      deleted,
      freed: mb(bytes),
      ...(failed.length ? { failed } : {}),
      ...(missing.length ? { notFound: missing } : {}),
    });
  }

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
