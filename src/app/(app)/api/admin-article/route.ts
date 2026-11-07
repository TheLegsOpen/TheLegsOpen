import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { ARTICLE_CHAMPIONSHIP_TAGS, ARTICLE_SOURCES, findArticleSource } from "@/content/articles";
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
 *   /api/admin-article?tags                                dry run: championship tagging
 *   /api/admin-article?tags&confirm=TAG                    apply it
 *
 * Tagging is separate from publishing because the articles that need it were written in the
 * admin and have no Markdown source -- republishing them would overwrite words nobody has a copy
 * of. It writes the championship field and nothing else.
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
  const tags = request.nextUrl.searchParams.has("tags");

  const existingBySlug = new Map(
    (await payload.find({ collection: "articles", limit: 500, depth: 0, draft: true })).docs.map((doc) => [doc.slug, doc]),
  );

  // ?tags -- set the championship on articles written in the admin, which have no Markdown source
  // to republish. Only that one field is written, so nothing anyone typed is touched, and each
  // article keeps whatever status it already had rather than being published as a side effect.
  if (tags) {
    const apply = request.nextUrl.searchParams.get("confirm") === "TAG";
    const championshipByYear = new Map(
      (await payload.find({ collection: "championships", limit: 500, depth: 0 })).docs.map((doc) => [doc.year, String(doc.id)]),
    );

    const results = [];
    for (const tag of ARTICLE_CHAMPIONSHIP_TAGS) {
      const article = existingBySlug.get(tag.slug);
      const championshipId = championshipByYear.get(tag.championshipYear);

      if (!article) {
        results.push({ slug: tag.slug, status: "skipped -- no article on the site with this slug" });
        continue;
      }
      if (!championshipId) {
        results.push({ slug: tag.slug, status: `skipped -- no championship for ${tag.championshipYear}` });
        continue;
      }
      // The find above runs at depth: 0, so an already-tagged article comes back with
      // `championship` as a raw number rather than a populated object -- and 22 === "22" is
      // false, so every tagged article read as untagged. Harmless to the data, since writing
      // the same id twice changes nothing, but it re-saved published articles that needed
      // nothing and reported four real changes as seven. Normalise both sides to a string.
      const current =
        article.championship == null
          ? undefined
          : String(typeof article.championship === "object" ? article.championship.id : article.championship);
      if (current === championshipId) {
        results.push({ slug: tag.slug, status: `already tagged to ${tag.championshipYear}` });
        continue;
      }
      if (!apply) {
        results.push({ slug: tag.slug, status: `would tag to ${tag.championshipYear}`, articleId: article.id });
        continue;
      }

      await payload.update({
        collection: "articles",
        id: article.id,
        data: { championship: championshipId },
        // Keep the article where it is. Passing draft: false on something still in draft would
        // publish it, which is not what tagging is for.
        draft: article._status !== "published",
      });
      results.push({ slug: tag.slug, status: `tagged to ${tag.championshipYear}`, articleId: article.id });
    }

    return NextResponse.json({
      mode: "tags",
      applied: apply,
      message: apply ? "Done." : "Nothing written. Add &confirm=TAG to apply.",
      results,
    });
  }

  if (!slug) {
    // A source whose championship year already has an article under a *different* slug would be
    // created alongside it rather than updating it, leaving the year with two write-ups. That is
    // how the 2016 source sits today, and `alreadyOnSite: false` on its own reads like an
    // invitation to publish it, so say so plainly here instead.
    const taggedYearBySlug = new Map(ARTICLE_CHAMPIONSHIP_TAGS.map((tag) => [tag.slug, tag.championshipYear]));

    return NextResponse.json({
      available: ARTICLE_SOURCES.map((source) => {
        const clash = source.championshipYear
          ? [...existingBySlug.keys()]
              .filter((key): key is string => typeof key === "string")
              .find((key) => key !== source.slug && taggedYearBySlug.get(key) === source.championshipYear)
          : undefined;
        return {
          slug: source.slug,
          title: source.title,
          publishedAt: source.publishedAt,
          championshipYear: source.championshipYear,
          words: source.markdown.split(/\s+/).filter(Boolean).length,
          alreadyOnSite: existingBySlug.has(source.slug),
          ...(clash
            ? { warning: `${source.championshipYear} already has an article on the site under the slug "${clash}". Publishing this would add a second one rather than update it.` }
            : {}),
        };
      }),
      usage: "Add ?slug=<slug> for a dry run, then &confirm=PUBLISH to write it (&live=true to publish rather than draft).",
      tagging: "Add ?tags for a dry run of championship tagging, then &confirm=TAG to apply. That writes only the championship field and never touches an article's words or status.",
    });
  }

  const source = findArticleSource(slug);
  if (!source) {
    return NextResponse.json({ error: `No article source with slug "${slug}"`, available: ARTICLE_SOURCES.map((s) => s.slug) }, { status: 404 });
  }

  const body = markdownToLexical(source.markdown);
  const existing = existingBySlug.get(source.slug);

  // Articles has carried a `championship` relationship since 30 October 2026, and this route never
  // set it -- so every article on the site had it empty and nothing was joined to anything.
  // Resolved by year rather than hardcoded id, since ids are whatever the database handed out.
  let championship: string | undefined;
  if (source.championshipYear) {
    const match = await payload.find({
      collection: "championships",
      where: { year: { equals: source.championshipYear } },
      limit: 1,
      depth: 0,
    });
    championship = match.docs[0] ? String(match.docs[0].id) : undefined;
    if (!championship) {
      return NextResponse.json(
        { error: `No championship found for year ${source.championshipYear} -- refusing to publish an unlinked write-up` },
        { status: 409 },
      );
    }
  }

  // Category is a relationship to article-categories now, not an enum, so the name in the source
  // has to be resolved to a row. Refuse rather than publish something miscategorised.
  const categoryMatch = await payload.find({
    collection: "article-categories",
    where: { name: { equals: source.category } },
    limit: 1,
    depth: 0,
  });
  const categoryId = categoryMatch.docs[0] ? String(categoryMatch.docs[0].id) : undefined;
  if (!categoryId) {
    return NextResponse.json(
      { error: `No article category named "${source.category}". Add it under Article Categories first, or correct the source.` },
      { status: 409 },
    );
  }

  const data = {
    title: source.title,
    slug: source.slug,
    dek: source.dek,
    category: categoryId,
    publishedAt: source.publishedAt,
    readTimeMinutes: readingTimeMinutes(source.markdown),
    heroLabel: source.heroLabel,
    body,
    ...(championship ? { championship } : {}),
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
