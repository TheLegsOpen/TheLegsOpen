import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";

import configPromise from "@/payload.config";
import type { Player, Scorecard } from "@/payload-types";

/**
 * Re-derives every championship handicap and every scorecard total for one championship.
 *
 * Needed whenever the venue's Course Rating or Slope changes after scores exist -- the 2026
 * championship switched from the white tees to the green ones after the field had played the first
 * hole. Neither figure recalculates on its own: a playing handicap is written by Players'
 * beforeValidate hook, the card totals by Scorecards', and both only run when that record is saved.
 * Leave them and the leaderboard contradicts itself, because it draws its hole-by-hole grid live
 * from the venue but takes positions and totals from the stored fields.
 *
 * Two details make this work, and both are easy to miss:
 *
 *   - A player only recalculates when handicapIndex is present in the update payload, so the index
 *     is read and written straight back rather than saving an empty patch.
 *   - A scorecard only recalculates when `holes` is present, so its own holes go back untouched.
 *     Untouched matters: the strokes are identical, so scoreUpdatedAt does not move and the
 *     live-blog hook bails on its own. suppressLiveBlog is set as well, belt and braces -- nobody
 *     wants 600 posts replayed into the feed.
 *
 * Players are done first: the card totals are calculated off the player's handicap, so the order is
 * load-bearing.
 *
 * Idempotent -- running it twice produces the same answer, since everything is derived from the
 * index and the venue. Safe to re-run after changing the venue back.
 *
 * TEMPORARY (2026-09-14). Admin-authenticated, and gated behind an explicit confirm so it cannot
 * fire from a stray link or a prefetch. Delete once the 2026 results are settled.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const payload = await getPayload({ config: configPromise });
  const { user } = await payload.auth({ headers: request.headers });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const championshipId = params.get("championship") ?? "37";
  const confirmed = params.get("confirm") === "RECALCULATE";

  const [players, scorecards] = await Promise.all([
    payload.find({ collection: "players", where: { inField: { equals: true } }, limit: 200, depth: 0 }),
    payload.find({
      collection: "scorecards",
      where: { championship: { equals: championshipId } },
      limit: 200,
      depth: 0,
    }),
  ]);

  const before = {
    players: (players.docs as Player[]).map((p) => ({
      id: String(p.id),
      name: p.name,
      handicapIndex: p.handicapIndex ?? null,
      championshipHandicap: p.championshipHandicap ?? null,
    })),
    scorecards: (scorecards.docs as Scorecard[]).map((c) => ({
      id: String(c.id),
      player: String(typeof c.player === "object" ? (c.player as Player).id : c.player),
      nettTotal: c.nettTotal ?? null,
      stablefordTotal: c.stablefordTotal ?? null,
      grossTotal: c.grossTotal ?? null,
    })),
  };

  if (!confirmed) {
    return NextResponse.json({
      dryRun: true,
      message:
        "Nothing changed. Re-run with &confirm=RECALCULATE to re-save these records and recalculate handicaps and totals.",
      championship: championshipId,
      wouldResave: { players: before.players.length, scorecards: before.scorecards.length },
      playersWithoutIndex: before.players.filter((p) => p.handicapIndex === null).map((p) => p.name),
      before,
    });
  }

  const errors: { record: string; error: string }[] = [];

  // Players first -- card totals are derived from the handicap this writes.
  let playersUpdated = 0;
  for (const p of players.docs as Player[]) {
    if (typeof p.handicapIndex !== "number") continue; // nothing to derive from; leave any manual value alone
    try {
      await payload.update({
        collection: "players",
        id: p.id,
        data: { handicapIndex: p.handicapIndex },
      });
      playersUpdated++;
    } catch (err) {
      errors.push({ record: `player ${p.name}`, error: err instanceof Error ? err.message : "failed" });
    }
  }

  let scorecardsUpdated = 0;
  for (const c of scorecards.docs as Scorecard[]) {
    try {
      await payload.update({
        collection: "scorecards",
        id: c.id,
        data: { holes: c.holes ?? [] },
        context: { suppressLiveBlog: true },
      });
      scorecardsUpdated++;
    } catch (err) {
      errors.push({ record: `scorecard ${c.id}`, error: err instanceof Error ? err.message : "failed" });
    }
  }

  const [playersAfter, cardsAfter] = await Promise.all([
    payload.find({ collection: "players", where: { inField: { equals: true } }, limit: 200, depth: 0 }),
    payload.find({
      collection: "scorecards",
      where: { championship: { equals: championshipId } },
      limit: 200,
      depth: 0,
    }),
  ]);

  const handicapBefore = new Map(before.players.map((p) => [p.id, p.championshipHandicap]));
  const cardBefore = new Map(before.scorecards.map((c) => [c.id, c]));
  const nameById = new Map(before.players.map((p) => [p.id, p.name]));

  return NextResponse.json({
    championship: championshipId,
    playersUpdated,
    scorecardsUpdated,
    errors,
    handicapChanges: (playersAfter.docs as Player[])
      .map((p) => ({
        name: p.name,
        from: handicapBefore.get(String(p.id)) ?? null,
        to: p.championshipHandicap ?? null,
      }))
      .filter((row) => row.from !== row.to),
    scoreChanges: (cardsAfter.docs as Scorecard[])
      .map((c) => {
        const prev = cardBefore.get(String(c.id));
        const playerId = String(typeof c.player === "object" ? (c.player as Player).id : c.player);
        return {
          name: nameById.get(playerId) ?? playerId,
          nett: { from: prev?.nettTotal ?? null, to: c.nettTotal ?? null },
          stableford: { from: prev?.stablefordTotal ?? null, to: c.stablefordTotal ?? null },
          gross: { from: prev?.grossTotal ?? null, to: c.grossTotal ?? null },
        };
      })
      .filter((row) => row.nett.from !== row.nett.to || row.stableford.from !== row.stableford.to),
  });
}
