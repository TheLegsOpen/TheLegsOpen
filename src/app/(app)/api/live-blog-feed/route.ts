import { NextRequest, NextResponse } from "next/server";

import { getLiveBlogPosts, LIVE_BLOG_FILTERS, type LiveBlogFilter } from "@/lib/data/live-blog";

/** Backs the Live Blog page's "Load more" button — same data the initial server render uses, just for a later page. */
export async function GET(request: NextRequest) {
  const pageParam = request.nextUrl.searchParams.get("page");
  const page = pageParam ? Number(pageParam) : 1;
  if (!Number.isInteger(page) || page < 1) {
    return NextResponse.json({ error: "Provide a valid positive integer ?page=" }, { status: 400 });
  }

  const championshipId = request.nextUrl.searchParams.get("championshipId") ?? undefined;
  const filterParam = request.nextUrl.searchParams.get("filter") as LiveBlogFilter | null;
  const filter = filterParam && LIVE_BLOG_FILTERS.includes(filterParam) ? filterParam : "all";
  const result = await getLiveBlogPosts(page, undefined, championshipId, filter);
  return NextResponse.json(result);
}
