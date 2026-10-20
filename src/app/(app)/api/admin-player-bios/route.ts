import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";

import bios from "@/data/player-bios.json";
import { markdownToLexical } from "@/lib/articles/markdown-to-lexical";
import configPromise from "@/payload.config";

/**
 * Writes a profile biography for every player.
 *
 * Each one is built only from what this database already records -- appearances, finishes,
 * winning scores, Stableford and Scratch titles, gross rounds, handicaps and no-returns. Nothing
 * is inferred about a player beyond their Legs Open results, and no claim appears that could not
 * be checked against a scorecard.
 *
 * The finishes behind them were recomputed from the scorecards rather than read off a page, and
 * validated first: the Main, Stableford and Scratch winners that calculation produced match the
 * winner each of the fourteen championship records stores. Every superlative was then checked
 * against the whole field rather than asserted -- a first pass claimed the lowest winning score
 * was clear by two shots when it is clear by one, that Toby Stanton was one of two Englishmen
 * when he is the only one, and that two Stableford points was the lowest ever recorded when four
 * players at Gullane in 2018 finished on none.
 *
 * Idempotent and safe to re-run: a bio is rewritten from the same source text every time.
 *
 *   /api/admin-player-bios                         dry run: who gets one, who is skipped
 *   /api/admin-player-bios?confirm=WRITE           write them
 *   /api/admin-player-bios?name=Mark+Alston&...    one player, for checking the wording first
 *
 * `overwrite=yes` is needed to replace a bio that already exists, so a hand-written one is never
 * quietly thrown away.
 *
 * Open it in a browser already signed in to the admin.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SOURCE = bios as Record<string, string>;

export async function GET(request: NextRequest) {
  const payload = await getPayload({ config: configPromise });
  const { user } = await payload.auth({ headers: request.headers });
  if (!user) return NextResponse.json({ error: "Unauthorized -- open this while signed in to the admin" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const only = params.get("name");
  const confirmed = params.get("confirm") === "WRITE";
  const overwrite = params.get("overwrite") === "yes";

  const players = await payload.find({ collection: "players", limit: 300, depth: 0, sort: "name" });

  const rows = players.docs
    .filter((p) => (only ? p.name === only : true))
    .map((p) => ({
      id: p.id,
      name: p.name as string,
      hasBio: Boolean(p.bio),
      text: SOURCE[p.name as string],
    }));

  const missing = rows.filter((r) => !r.text).map((r) => r.name);
  const writable = rows.filter((r) => r.text && (overwrite || !r.hasBio));
  const skipped = rows.filter((r) => r.text && r.hasBio && !overwrite).map((r) => r.name);

  if (!confirmed) {
    return NextResponse.json({
      dryRun: true,
      message: "Nothing changed. Re-run with &confirm=WRITE to save these.",
      summary: { players: rows.length, wouldWrite: writable.length, alreadyHaveOne: skipped.length, noBioWritten: missing.length },
      alreadyHaveOne: skipped,
      noBioWritten: missing,
      sample: writable.slice(0, 3).map((r) => ({ name: r.name, bio: r.text })),
      note: "Add &overwrite=yes to replace a bio that already exists; without it those are left alone.",
    });
  }

  let written = 0;
  const failures: { name: string; message: string }[] = [];
  for (const row of writable) {
    try {
      await payload.update({ collection: "players", id: row.id, data: { bio: markdownToLexical(row.text!) } });
      written++;
    } catch (err) {
      failures.push({ name: row.name, message: err instanceof Error ? err.message : "failed" });
    }
  }

  return NextResponse.json({
    ok: failures.length === 0,
    written,
    skippedExisting: skipped.length,
    noBioWritten: missing,
    failed: failures.length,
    failures: failures.slice(0, 10),
  });
}
