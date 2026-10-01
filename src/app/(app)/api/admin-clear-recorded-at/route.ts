import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";

import configPromise from "@/payload.config";

/**
 * Strips per-hole recordedAt stamps from championships played before 2027.
 *
 * Those rounds are meant to carry none. round-timeline.ts falls back to the tee sheet for them,
 * which is the club's own rule: every championship from 2013 to 2026 is timed from the backdated
 * tee sheet, and only 2027 onwards uses real per-hole stamps.
 *
 * They acquired stamps anyway. The old rule in Scorecards' beforeValidate stamped any scored hole
 * that lacked one, rather than only a hole newly scored in that save -- so re-saving an old card
 * for any reason retro-stamped the whole round with the date of the edit. Every replay did it
 * (2021, 2022 and 2025 carry their replay's wall clock), and fixing 2026's handicaps on 1 October
 * did it in twenty minutes flat, which is not a round at all. Because a stamp wins over the tee
 * sheet, the 2026 largest-lead record was recomputed off those twenty minutes and changed from
 * Findlay by 4 after the 5th to Leisegang by 2 after the 18th.
 *
 * Clearing is a context flag rather than a null, because a null would be resurrected by the
 * originalDoc fallback in that same hook.
 *
 * Strokes, handicaps, totals and blog posts are untouched; this only removes a timestamp that
 * should never have been written. Re-tick Completed afterwards so the stats recompute off the tee
 * sheet.
 *
 *   /api/admin-clear-recorded-at                       dry run: what carries stamps
 *   /api/admin-clear-recorded-at?confirm=CLEAR         strip them
 *   /api/admin-clear-recorded-at?year=2026&confirm=... one championship only
 *
 * Open it in a browser already signed in to the admin.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** 2027 is where the club's rule changes: from then on a stamp is real and must be kept. */
const FIRST_TIMED_YEAR = 2027;

export async function GET(request: NextRequest) {
  const payload = await getPayload({ config: configPromise });
  const { user } = await payload.auth({ headers: request.headers });
  if (!user) return NextResponse.json({ error: "Unauthorized -- open this while signed in to the admin" }, { status: 401 });

  const yearParam = request.nextUrl.searchParams.get("year");
  const confirmed = request.nextUrl.searchParams.get("confirm") === "CLEAR";

  const championships = await payload.find({ collection: "championships", limit: 500, depth: 0, sort: "year" });
  const targets = championships.docs.filter((c) => {
    if (typeof c.year !== "number" || c.year >= FIRST_TIMED_YEAR) return false;
    return yearParam ? String(c.year) === yearParam : true;
  });

  if (targets.length === 0) {
    return NextResponse.json(
      { error: yearParam ? `No championship before ${FIRST_TIMED_YEAR} for ${yearParam}` : "Nothing to clear" },
      { status: 404 },
    );
  }

  const report: { year: number; cards: number; holesStamped: number; span?: string; cleared?: number }[] = [];
  let totalCleared = 0;
  const failures: { what: string; message: string }[] = [];

  for (const championship of targets) {
    const cards = await payload.find({
      collection: "scorecards",
      where: { championship: { equals: championship.id } },
      limit: 200,
      depth: 0,
    });

    const stamps = cards.docs.flatMap((c) => (c.holes ?? []).map((h) => h.recordedAt).filter(Boolean) as string[]).sort();
    const row: (typeof report)[number] = {
      year: championship.year as number,
      cards: cards.totalDocs,
      holesStamped: stamps.length,
      span: stamps.length ? `${stamps[0]} -> ${stamps[stamps.length - 1]}` : undefined,
    };

    if (confirmed && stamps.length > 0) {
      let cleared = 0;
      for (const card of cards.docs) {
        if (!(card.holes ?? []).some((h) => h.recordedAt)) continue;
        try {
          await payload.update({
            collection: "scorecards",
            id: card.id,
            data: { holes: card.holes ?? [] },
            // clearRecordedAt strips the stamps; suppressLiveBlog keeps the generator out of a
            // save that changes no score.
            context: { clearRecordedAt: true, suppressLiveBlog: true },
          });
          cleared++;
        } catch (err) {
          failures.push({ what: `${championship.year} scorecard ${card.id}`, message: err instanceof Error ? err.message : "failed" });
        }
      }
      row.cleared = cleared;
      totalCleared += cleared;
    }

    report.push(row);
  }

  if (!confirmed) {
    return NextResponse.json({
      dryRun: true,
      message: "Nothing changed. Re-run with &confirm=CLEAR to strip these.",
      rule: `Championships before ${FIRST_TIMED_YEAR} are timed from the tee sheet and should carry no per-hole stamps.`,
      championships: report.filter((r) => r.holesStamped > 0),
      alreadyClean: report.filter((r) => r.holesStamped === 0).map((r) => r.year),
    });
  }

  return NextResponse.json({
    ok: failures.length === 0,
    cardsCleared: totalCleared,
    failed: failures.length,
    failures: failures.slice(0, 10),
    championships: report,
    next: "Re-tick Completed on any championship cleared here so its stats recompute off the tee sheet.",
  });
}
