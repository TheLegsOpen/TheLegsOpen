import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { ARTICLE_SOURCES, findArticleSource } from "@/content/articles";
import { markdownToLexical, readingTimeMinutes } from "@/lib/articles/markdown-to-lexical";

/**
 * Publishes a championship write-up from src/content/articles into the Articles collection.
 *
 * An article body is a Lexical node tree rather than text, so a piece written as Markdown can't
 * simply be pasted into the admin. This converts it and creates the document -- as a draft unless
 * asked otherwise, so nothing appears on the site until it has been read in the admin and
 * published there.
 *
 * Open it in a browser already signed in to the admin; it authenticates on that session, the same
 * way the backdating routes do.
 *
 *   /api/admin-article                                    list what's available and its status
 *   /api/admin-article?slug=...                            dry run: show what would be written
 *   /api/admin-article?slug=...&confirm=PUBLISH            write it (draft)
 *   /api/admin-article?slug=...&confirm=PUBLISH&live=true  write it and publish immediately
 *
 * Re-running against a slug that already exists updates that article rather than making a second
 * copy, and never touches its image -- so a picture added in the admin survives a re-publish.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const payload = await getPayload({ config: configPromise });
  const { user } = await payload.auth({ headers: request.headers });
  if (!user) return NextResponse.json({ error: "Unauthorized -- open this while signed in to the admin" }, { status: 401 });

  const slug = request.nextUrl.searchParams.get("slug");
  const confirmed = request.nextUrl.searchParams.get("confirm") === "PUBLISH";
  const live = request.nextUrl.searchParams.get("live") === "true";

  const existingBySlug = new Map(
    (await payload.find({ collection: "articles", limit: 500, depth: 0, draft: true })).docs.map((doc) => [doc.slug, doc]),
  );

  if (!slug) {
    return NextResponse.json({
      available: ARTICLE_SOURCES.map((source) => ({
        slug: source.slug,
        title: source.title,
        publishedAt: source.publishedAt,
        words: source.markdown.split(/\s+/).filter(Boolean).length,
        alreadyOnSite: existingBySlug.has(source.slug),
      })),
      usage: "Add ?slug=<slug> for a dry run, then &confirm=PUBLISH to write it (&live=true to publish rather than draft).",
    });
  }

  const source = findArticleSource(slug);
  if (!source) {
    return NextResponse.json({ error: `No article source with slug "${slug}"`, available: ARTICLE_SOURCES.map((s) => s.slug) }, { status: 404 });
  }

  const body = markdownToLexical(source.markdown);
  const existing = existingBySlug.get(source.slug);

  const data = {
    title: source.title,
    slug: source.slug,
    dek: source.dek,
    category: source.category,
    publishedAt: source.publishedAt,
    readTimeMinutes: readingTimeMinutes(source.markdown),
    heroLabel: source.heroLabel,
    body,
  };

  if (!confirmed) {
    const blocks = body.root.children;
    return NextResponse.json({
      dryRun: true,
      message: "Nothing written. Add &confirm=PUBLISH to create it as a draft, plus &live=true to publish it straight away.",
      action: existing ? `would UPDATE existing article ${existing.id}` : "would CREATE a new article",
      ...data,
      body: {
        blocks: blocks.length,
        headings: blocks.filter((node) => node.type === "heading").length,
        paragraphs: blocks.filter((node) => node.type === "paragraph").length,
        lists: blocks.filter((node) => node.type === "list").length,
        firstParagraph: blocks.find((node) => node.type === "paragraph")?.children.map((n) => ("text" in n ? n.text : "")).join(""),
      },
    });
  }

  try {
    const doc = existing
      ? await payload.update({
          collection: "articles",
          id: existing.id,
          // The image is left out of `data` entirely, so one attached in the admin isn't wiped by
          // a re-publish of the words.
          data: { ...data, ...(live ? { _status: "published" as const } : {}) },
          draft: !live,
        })
      : await payload.create({
          collection: "articles",
          data: { ...data, _status: live ? ("published" as const) : ("draft" as const) },
          draft: !live,
        });

    return NextResponse.json({
      ok: true,
      action: existing ? "updated" : "created",
      id: doc.id,
      status: live ? "published" : "draft",
      admin: `/admin/collections/articles/${doc.id}`,
      live: live ? `/latest/${doc.slug}` : "not published yet -- publish it from the admin when you're happy with it",
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "failed" }, { status: 500 });
  }
}
