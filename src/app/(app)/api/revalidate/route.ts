import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

/**
 * Point a WordPress "on publish" webhook at
 * `/api/revalidate?secret=...&path=/latest` (see src/lib/data/articles.ts)
 * so new posts appear without a full redeploy. Requires REVALIDATE_SECRET
 * to be set — this route 401s until it is.
 */
export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  const path = request.nextUrl.searchParams.get("path") ?? "/latest";

  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
  }

  revalidatePath(path);
  return NextResponse.json({ revalidated: true, path, now: Date.now() });
}
