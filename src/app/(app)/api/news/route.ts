import { NextRequest, NextResponse } from "next/server";

import { getArticlesPage } from "@/lib/data/articles";
import { delay } from "@/lib/mock-api";
import type { ArticleCategory } from "@/types/article";

import { NEWS_PAGE_SIZE as PAGE_SIZE } from "@/lib/news-page-size";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = Number(searchParams.get("page") ?? "1");
  const category = searchParams.get("category") as ArticleCategory | "All" | null;

  await delay(500);

  const result = await getArticlesPage({ page, pageSize: PAGE_SIZE, category: category ?? "All" });

  return NextResponse.json(result);
}
