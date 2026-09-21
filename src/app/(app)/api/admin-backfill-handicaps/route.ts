import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";

import configPromise from "@/payload.config";
import type { Player, Scorecard } from "@/payload-types";

/**
 * Fills in playingHandicap on scorecards that were scored before the field existed.
 *
 * The handicap each card was played off is not lost, despite never having been stored: a completed
 * card's nett total is its gross minus the strokes received, so gross - nett IS the handicap, exact
 * and independent of whatever the player's figure has since become. Verified against every complete
 * card -- David Pow's 2013 card yields 20 where his player record now reads 24, which is precisely
 * the drift this whole change exists to stop.
 *
 * That arithmetic only holds for a card with all eighteen holes and no pick-up. A partial or
 * no-return card received strokes on the holes it played, not all eighteen, so gross - nett
 * understates the handicap. Those are reported rather than guessed at -- a wrong handicap silently
 * written is worse than an empty field, which simply falls back to the player as it does today.
 *
 * Idempotent: a card that already carries a handicap is never touched, so this can be re-run, and
 * cards stamped live by the scoring hook are left exactly as scored.
 *
 * Writes with context.suppressLiveBlog. Without it, re-saving 80-odd finished cards would replay
 * years of championships into the live blog.
 *
 * TEMPORARY. Delete once the backfill is done and verified.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Row {
  id: string;
  player: string;
  year?: number;
  competition: string;
  gross: number | null;
  nett: number | null;
  derived?: number;
  playerHandicap: number | null;
  reason?: string;
}

export async function GET(request: NextRequest) {
  const payload = await getPayload({ config: configPromise });
  const { user } = await payload.auth({ headers: request.headers });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const confirmed = request.nextUrl.searchParams.get("confirm") === "BACKFILL";

  const [cards, players, championships] = await Promise.all([
    payload.find({ collection: "scorecards", limit: 500, depth: 0 }),
    payload.find({ collection: "players", limit: 500, depth: 0 }),
    payload.find({ collection: "championships", limit: 500, depth: 0 }),
  ]);

  const playerById = new Map((players.docs as Player[]).map((p) => [String(p.id), p]));
  const yearById = new Map(championships.docs.map((c) => [String(c.id), c.year as number]));

  const willSet: Row[] = [];
  const cannotDerive: Row[] = [];
  const alreadySet: Row[] = [];
  const unscored: Row[] = [];

  for (const card of cards.docs as Scorecard[]) {
    const playerId = String(typeof card.player === "object" ? (card.player as Player).id : card.player);
    const player = playerById.get(playerId);
    const championshipId = typeof card.championship === "object" && card.championship ? String(card.championship.id) : card.championship ? String(card.championship) : undefined;
    const isPractice = !championshipId;

    const row: Row = {
      id: String(card.id),
      player: player?.name ?? playerId,
      year: championshipId ? yearById.get(championshipId) : undefined,
      competition: isPractice ? "practice" : "championship",
      gross: card.grossTotal ?? null,
      nett: card.nettTotal ?? null,
      playerHandicap: (isPractice ? (player?.practiceHandicap ?? player?.championshipHandicap) : player?.championshipHandicap) ?? null,
    };

    if (card.playingHandicap != null) {
      alreadySet.push({ ...row, derived: card.playingHandicap });
      continue;
    }

    const holes = card.holes ?? [];
    const scored = holes.filter((h) => h.strokes != null || h.noReturn).length;
    if (scored === 0) {
      unscored.push({ ...row, reason: "never scored -- will stamp itself when played" });
      continue;
    }

    const complete = scored === 18 && holes.every((h) => h.strokes != null) && !holes.some((h) => h.noReturn);
    if (!complete || card.grossTotal == null || card.nettTotal == null) {
      cannotDerive.push({
        ...row,
        reason: "partial or no-return card -- gross minus nett understates the handicap here, so it is left unset and falls back to the player",
      });
      continue;
    }

    willSet.push({ ...row, derived: card.grossTotal - card.nettTotal });
  }

  if (!confirmed) {
    return NextResponse.json({
      dryRun: true,
      message: "Nothing changed. Re-run with &confirm=BACKFILL to write these.",
      summary: {
        total: cards.docs.length,
        willSet: willSet.length,
        cannotDerive: cannotDerive.length,
        alreadySet: alreadySet.length,
        unscored: unscored.length,
      },
      // Where the derived figure disagrees with the player's figure today, the card is carrying
      // history the player record has already lost. These are the ones this whole change is for.
      differsFromPlayer: willSet.filter((r) => r.derived !== r.playerHandicap),
      willSet,
      cannotDerive,
    });
  }

  const errors: { id: string; error: string }[] = [];
  let updated = 0;
  for (const row of willSet) {
    try {
      await payload.update({
        collection: "scorecards",
        id: row.id,
        data: { playingHandicap: row.derived },
        context: { suppressLiveBlog: true },
      });
      updated++;
    } catch (err) {
      errors.push({ id: row.id, error: err instanceof Error ? err.message : "failed" });
    }
  }

  return NextResponse.json({
    updated,
    errors,
    stillUnset: cannotDerive.length + unscored.length,
    cannotDerive,
    note: "Cards left unset fall back to the player's current handicap, exactly as before this field existed.",
  });
}
