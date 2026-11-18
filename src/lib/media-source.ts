/**
 * Where to read an uploaded file's original bytes from, for the routes that reprocess photos
 * (/api/portrait, /api/cutout). Straight from Vercel Blob, at the address the storage plugin itself
 * builds from the token (node_modules/@payloadcms/storage-vercel-blob), rather than back through
 * this site's own /api/media/file: on a branch preview that self-request hits Vercel's login wall
 * and comes back as its HTML page, so every reprocessed photo there was broken. It also skips a hop.
 * Without a token (local dev against no Blob store) it falls back to the site's own media route.
 */
export function mediaSourceUrl(file: string, requestUrl: string): string {
  const storeId = process.env.BLOB_READ_WRITE_TOKEN?.match(/^vercel_blob_rw_([a-z\d]+)_[a-z\d]+$/i)?.[1]?.toLowerCase();
  const base = process.env.STORAGE_VERCEL_BLOB_BASE_URL || (storeId ? `https://${storeId}.public.blob.vercel-storage.com` : undefined);
  return base ? `${base}/${encodeURIComponent(file)}` : new URL(`/api/media/file/${encodeURIComponent(file)}`, requestUrl).toString();
}
