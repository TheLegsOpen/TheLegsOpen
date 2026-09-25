import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";

import configPromise from "@/payload.config";

/**
 * Corrects or removes a published live-blog post.
 *
 * The generator gets things wrong occasionally, and when it does the mistake is a database row
 * that a code fix doesn't retrospectively touch. The rerun route can only create posts, so until
 * now the only way to repair one was by hand in the admin -- which is a poor answer when the fault
 * was mine rather than the club's.
 *
 * Corrections are declared below rather than passed in the URL, so every change to a published
 * post is visible in the repository's history alongside the code change that stopped it happening
 * again. Dry run by default.
 *
 *   /api/admin-blog-fix                          list what's on offer
 *   /api/admin-blog-fix?id=<post id>             show the current text and what would replace it
 *   /api/admin-blog-fix?id=<post id>&confirm=FIX apply it
 *
 * Open it in a browser already signed in to the admin.
 */

export const dynamic = "force-dynamic";

interface Correction {
  postId: string;
  /** Why this post was wrong -- for the reader of this file, not for the site. */
  reason: string;
  headline?: string;
  body?: string;
  /** Set instead of headline/body when the post shouldn't exist at all. */
  remove?: boolean;
}

const CORRECTIONS: Correction[] = [
  {
    postId: "3709",
    reason:
      "Published during the 2019 rerun. Claimed Forbes's -1 was the lowest winning total in " +
      "championship history and named 2018's +2 as the previous best. Alastair Campbell won at " +
      "-4 at Carnwath in 2013 -- invisible to the record lookup because he won on countback, " +
      "which shows as a tie for first. The lookup is fixed; this repairs what it published.",
    headline: "Lowest winning score since 2013",
    body:
      "Bryan Forbes wins on -1 — the lowest winning total since Alastair Campbell's -4 at " +
      "Carnwath in 2013, and only the second time the championship has been won under par.",
  },
];

export async function GET(request: NextRequest) {
  const payload = await getPayload({ config: configPromise });
  const { user } = await payload.auth({ headers: request.headers });
  if (!user) return NextResponse.json({ error: "Unauthorized -- open this while signed in to the admin" }, { status: 401 });

  const id = request.nextUrl.searchParams.get("id");
  const confirmed = request.nextUrl.searchParams.get("confirm") === "FIX";

  if (!id) {
    return NextResponse.json({
      available: CORRECTIONS.map((c) => ({ postId: c.postId, action: c.remove ? "remove" : "rewrite", reason: c.reason })),
      usage: "Add ?id=<post id> to see the change, then &confirm=FIX to apply it.",
    });
  }

  const correction = CORRECTIONS.find((c) => c.postId === id);
  if (!correction) {
    return NextResponse.json({ error: `No correction declared for post ${id}`, available: CORRECTIONS.map((c) => c.postId) }, { status: 404 });
  }

  const current = await payload.findByID({ collection: "live-blog-posts", id, depth: 0 }).catch(() => undefined);
  if (!current) return NextResponse.json({ error: `Post ${id} not found -- already dealt with?` }, { status: 404 });

  if (!confirmed) {
    return NextResponse.json({
      dryRun: true,
      message: "Nothing changed. Re-run with &confirm=FIX to apply.",
      reason: correction.reason,
      current: { headline: current.headline, body: current.body },
      proposed: correction.remove ? "(post removed)" : { headline: correction.headline ?? current.headline, body: correction.body ?? current.body },
    });
  }

  try {
    if (correction.remove) {
      await payload.delete({ collection: "live-blog-posts", id });
      return NextResponse.json({ ok: true, action: "removed", id });
    }
    const updated = await payload.update({
      collection: "live-blog-posts",
      id,
      data: {
        ...(correction.headline ? { headline: correction.headline } : {}),
        ...(correction.body ? { body: correction.body } : {}),
      },
    });
    return NextResponse.json({ ok: true, action: "rewritten", id, headline: updated.headline, body: updated.body });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "failed" }, { status: 500 });
  }
}
