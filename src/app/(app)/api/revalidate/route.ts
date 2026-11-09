import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { DATA_TAGS } from "@/lib/data-cache";

/**
 * Point a WordPress "on publish" webhook at
 * `/api/revalidate?secret=...&path=/latest` (see src/lib/data/articles.ts)
 * so new posts appear without a full redeploy. Requires REVALIDATE_SECRET
 * to be set — this route 401s until it is.
 *
 * `?data=all` also expires every cross-request data cache entry (src/lib/data-cache.ts). Use it
 * after writing straight to Postgres (SQL backfills, scripts): those writes skip Payload's hooks,
 * so nothing else will expire the cached leaderboards before DATA_CACHE_SECONDS runs out.
 */
export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  const path = request.nextUrl.searchParams.get("path") ?? "/latest";
  const expireAllData = request.nextUrl.searchParams.get("data") === "all";

  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
  }

  if (expireAllData) {
    for (const tag of Object.values(DATA_TAGS)) revalidateTag(tag, { expire: 0 });
  }
  revalidatePath(path);
  return NextResponse.json({ revalidated: true, path, data: expireAllData ? "all" : undefined, now: Date.now() });
}
