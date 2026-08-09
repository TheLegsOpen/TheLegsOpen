import { NextRequest, NextResponse } from "next/server";

import { getLiveBlogPosts } from "@/lib/data/live-blog";

/** Backs the Live Blog page's "Load more" button — same data the initial server render uses, just for a later page. */
export async function GET(request: NextRequest) {
  const pageParam = request.nextUrl.searchParams.get("page");
  const page = pageParam ? Number(pageParam) : 1;
  if (!Number.isInteger(page) || page < 1) {
    return NextResponse.json({ error: "Provide a valid positive integer ?page=" }, { status: 400 });
  }

  const result = await getLiveBlogPosts(page);
  return NextResponse.json(result);
}
