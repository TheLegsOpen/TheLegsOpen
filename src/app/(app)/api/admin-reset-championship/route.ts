import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";

import configPromise from "@/payload.config";

/**
 * Clears a championship back to an unplayed state so its round can be replayed.
 *
 * Deletes every live blog post for the championship, empties every scorecard's holes, and unticks
 * Completed. Nothing else is touched: the players, their playing handicaps, the tee sheet and the
 * championship record itself all survive, because a replay needs them.
 *
 * This exists because a rerun driven from the wrong tee times cannot be repaired by moving the
 * timestamps. The commentary is generated in the order scores arrive -- which player "takes the
 * lead" or "joins the race" depends on it -- so a round played in the wrong order has to be played
 * again rather than restamped. 2022 is that case: its sheet has a 36-minute gap before the last
 * group where the replay used nine minutes.
 *
 * SAFETY
 *
 *   - Only the years declared in RESETTABLE below can be touched, so this cannot be pointed at a
 *     championship by guessing a URL.
 *   - A championship currently marked "Currently Being Scored" is refused outright. Untick it
 *     first; that is a deliberate step, not an obstacle.
 *   - The dry run returns every scorecard hole by hole. For a championship whose results exist
 *     only here -- 2026 was played on the site rather than entered from HandicapMaster afterwards
 *     -- running the dry run first IS the backup, and nothing should be cleared until that output
 *     is saved somewhere outside this database.
 *
 *   /api/admin-reset-championship                            list what's on offer
 *   /api/admin-reset-championship?year=2022                  dry run: counts, plus every card
 *   /api/admin-reset-championship?year=2022&confirm=RESET    clear it
 *
 * Open it in a browser already signed in to the admin.
 */

export const dynamic = "force-dynamic";

interface Resettable {
  year: number;
  /** Why this one is being replayed rather than left alone. */
  reason: string;
}

const RESETTABLE: Resettable[] = [
  {
    year: 2026,
    reason:
      "Played live, and the scores for group 2 -- McGuire, Dundas, Park and Merrilees, out at " +
      "10.36 -- did not reach the site until around their 9th. The blog shows it plainly: their " +
      "first eight holes all appear at 12:37, three hours after they played them, in a single " +
      "burst of 32 posts. For those three hours the leaderboard and the commentary ran without " +
      "four players in the field, Dundas among them, who finished T4. The scores themselves are " +
      "right and have been verified against the export; it is the order they arrived in that was " +
      "wrong, and commentary reasons from that order. ONLY reset this with the full export in " +
      "hand -- 2026 was never entered from HandicapMaster, so there is no PDF to re-enter it from.",
  },
  {
    year: 2022,
    reason:
      "Replayed from invented tee times (noon, uniform nine-minute intervals) because the tee " +
      "sheet lookup read the wrong field. The real sheet is 11.00 to 12.24 with a 36-minute gap " +
      "before the last group, so Alston, Donaldson and Peffers played 33 minutes later relative " +
      "to the field than the replay had them. The commentary was reasoned in that wrong order, so " +
      "the round needs playing again rather than restamping.",
  },
];

export async function GET(request: NextRequest) {
  const payload = await getPayload({ config: configPromise });
  const { user } = await payload.auth({ headers: request.headers });
  if (!user) return NextResponse.json({ error: "Unauthorized -- open this while signed in to the admin" }, { status: 401 });

  const yearParam = request.nextUrl.searchParams.get("year");
  const confirmed = request.nextUrl.searchParams.get("confirm") === "RESET";

  if (!yearParam) {
    return NextResponse.json({
      available: RESETTABLE.map((r) => ({ year: r.year, reason: r.reason })),
      usage: "Add ?year=2022 for a dry run (which also dumps every card), then &confirm=RESET to clear it.",
      warning: "Save the dry run's scorecards before clearing any championship whose results exist only on this site.",
    });
  }

  const entry = RESETTABLE.find((r) => String(r.year) === yearParam);
  if (!entry) {
    return NextResponse.json(
      { error: `${yearParam} is not declared as resettable. Add it to RESETTABLE deliberately.`, available: RESETTABLE.map((r) => r.year) },
      { status: 404 },
    );
  }

  const championships = await payload.find({ collection: "championships", where: { year: { equals: entry.year } }, limit: 1, depth: 0 });
  const championship = championships.docs[0];
  if (!championship) return NextResponse.json({ error: `No championship for ${entry.year}` }, { status: 404 });

  if (championship.isActive) {
    return NextResponse.json(
      { error: `${entry.year} is marked "Currently Being Scored". Untick that first -- this refuses to clear a live championship.` },
      { status: 409 },
    );
  }

  const [posts, scorecards] = await Promise.all([
    payload.find({ collection: "live-blog-posts", where: { championship: { equals: championship.id } }, limit: 1000, depth: 0, sort: "postedAt" }),
    payload.find({ collection: "scorecards", where: { championship: { equals: championship.id } }, limit: 200, depth: 1 }),
  ]);

  const cards = scorecards.docs.map((card) => ({
    player: typeof card.player === "object" && card.player ? card.player.name : card.player,
    playingHandicap: card.playingHandicap,
    grossTotal: card.grossTotal,
    nettTotal: card.nettTotal,
    stablefordTotal: card.stablefordTotal,
    noReturn: card.noReturn,
    holes: [...(card.holes ?? [])]
      .sort((a, b) => (a.holeNumber ?? 0) - (b.holeNumber ?? 0))
      .map((h) => ({ hole: h.holeNumber, strokes: h.strokes ?? null, noReturn: h.noReturn ?? false })),
  }));

  const withScores = cards.filter((c) => c.holes.some((h) => h.strokes != null || h.noReturn));

  const summary = {
    year: entry.year,
    championshipId: championship.id,
    completed: championship.completed,
    postsToDelete: posts.totalDocs,
    scorecards: scorecards.totalDocs,
    scorecardsCarryingScores: withScores.length,
  };

  if (!confirmed) {
    return NextResponse.json({
      dryRun: true,
      message: "Nothing changed. Re-run with &confirm=RESET to clear it.",
      reason: entry.reason,
      warning: "SAVE THE `scorecards` BELOW before confirming. For a championship played on this site rather than entered from HandicapMaster, this is the only copy.",
      summary,
      scorecards: cards,
    });
  }

  let postsDeleted = 0;
  let cardsCleared = 0;
  const failures: { what: string; message: string }[] = [];

  for (const post of posts.docs) {
    try {
      await payload.delete({ collection: "live-blog-posts", id: post.id });
      postsDeleted++;
    } catch (err) {
      failures.push({ what: `post ${post.id}`, message: err instanceof Error ? err.message : "failed" });
    }
  }

  const empty = Array.from({ length: 18 }, () => ({ strokes: undefined, noReturn: false }));
  for (const card of scorecards.docs) {
    try {
      // suppressLiveBlog keeps the generator out of this -- emptying a card is not play, and
      // without it every cleared hole would be narrated as it went.
      await payload.update({ collection: "scorecards", id: card.id, data: { holes: empty }, context: { suppressLiveBlog: true } });
      cardsCleared++;
    } catch (err) {
      failures.push({ what: `scorecard ${card.id}`, message: err instanceof Error ? err.message : "failed" });
    }
  }

  // The round is about to be replayed, so it is no longer a finished championship. Leaving this
  // ticked would also have each cleared card trigger a stats recompute on the way past.
  if (championship.completed) {
    await payload
      .update({ collection: "championships", id: championship.id, data: { completed: false } })
      .catch((err) => failures.push({ what: "championship", message: err instanceof Error ? err.message : "failed" }));
  }

  return NextResponse.json({
    ok: failures.length === 0,
    postsDeleted,
    cardsCleared,
    completedUnticked: Boolean(championship.completed),
    failed: failures.length,
    failures: failures.slice(0, 10),
    summary,
    next: `Tick "Currently Being Scored" on ${entry.year}, then run the replay.`,
  });
}
