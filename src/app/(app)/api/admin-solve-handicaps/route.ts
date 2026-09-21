import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { allocateStrokes, stablefordPoints } from "@/lib/scoring";
import type { Player, Scorecard, TeeTimeRound, Venue } from "@/payload-types";

/**
 * Second backfill pass: recovers playingHandicap on the cards the first pass could not derive.
 *
 * A partial or no-return card breaks the gross-minus-nett shortcut, because the player received
 * strokes only on the holes they played. But the stored nett total is still the answer to an
 * equation with one unknown, so the handicap can be searched for instead: try every value from 0 to
 * 40, recompute the nett over exactly the holes that were played, and see which reproduces what is
 * stored.
 *
 * These cards matter more than their disqualification suggests. A no-return is out of Main and
 * Scratch, but it still scores in Stableford -- so a card left falling back to the player's current
 * handicap skews that leaderboard, which is the one place a picked-up round still counts.
 *
 * Some cards admit a small range rather than a single value. That happens when the extra strokes
 * would have landed only on holes that were picked up, which score nothing either way: every
 * candidate in the range produces identical totals and identical leaderboard output, so the card
 * itself cannot distinguish them. Those are reported with their range and left for a human rather
 * than being guessed at, since the field is shown in the admin and ought to read truthfully.
 *
 * Idempotent, dry run by default, and writes with suppressLiveBlog.
 *
 * TEMPORARY. Delete once the recovery is done.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_HANDICAP = 40;

export async function GET(request: NextRequest) {
  const payload = await getPayload({ config: configPromise });
  const { user } = await payload.auth({ headers: request.headers });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const confirmed = request.nextUrl.searchParams.get("confirm") === "SOLVE";

  const [cards, players, championships, rounds, venues] = await Promise.all([
    payload.find({ collection: "scorecards", limit: 500, depth: 0 }),
    payload.find({ collection: "players", limit: 500, depth: 0 }),
    payload.find({ collection: "championships", limit: 500, depth: 0 }),
    payload.find({ collection: "tee-time-rounds", limit: 200, depth: 0 }),
    payload.find({ collection: "venues", limit: 200, depth: 0 }),
  ]);

  const playerById = new Map((players.docs as Player[]).map((p) => [String(p.id), p]));
  const venueById = new Map((venues.docs as Venue[]).map((v) => [String(v.id), v]));
  const championshipById = new Map(championships.docs.map((c) => [String(c.id), c]));
  const roundById = new Map((rounds.docs as TeeTimeRound[]).map((r) => [String(r.id), r]));

  const idOf = (rel: unknown): string | undefined =>
    rel == null ? undefined : String(typeof rel === "object" ? (rel as { id: unknown }).id : rel);

  const solved: Record<string, unknown>[] = [];
  const ambiguous: Record<string, unknown>[] = [];
  const noSolution: Record<string, unknown>[] = [];

  for (const card of cards.docs as Scorecard[]) {
    if (card.playingHandicap != null) continue;

    const holes = card.holes ?? [];
    const scored = holes.filter((h) => h.strokes != null || h.noReturn).length;
    if (scored === 0) continue; // never played; it will stamp itself
    if (card.nettTotal == null) continue;

    // The venue decides par and stroke index, and therefore which holes a stroke lands on.
    const championshipId = idOf(card.championship);
    const roundId = idOf(card.teeTimeRound);
    const venueId = championshipId
      ? idOf(championshipById.get(championshipId)?.venue)
      : roundId
        ? idOf(roundById.get(roundId)?.venue)
        : undefined;
    const venue = venueId ? venueById.get(venueId) : undefined;
    const player = playerById.get(idOf(card.player) ?? "");

    const base = {
      id: String(card.id),
      player: player?.name ?? "?",
      year: championshipId ? championshipById.get(championshipId)?.year : undefined,
      competition: championshipId ? "championship" : "practice",
      storedNett: card.nettTotal,
      playerHandicap: (championshipId ? player?.championshipHandicap : (player?.practiceHandicap ?? player?.championshipHandicap)) ?? null,
    };

    if (!venue?.holes?.length) {
      noSolution.push({ ...base, reason: "no venue hole data to allocate strokes against" });
      continue;
    }

    const holeInfos = Array.from({ length: 18 }, (_, i) => ({
      par: venue.holes?.[i]?.par ?? 4,
      si: venue.holes?.[i]?.si ?? i + 1,
    }));

    const candidates: number[] = [];
    for (let handicap = 0; handicap <= MAX_HANDICAP; handicap++) {
      const received = allocateStrokes(handicap, holeInfos);
      let nett = 0;
      let points = 0;
      holes.forEach((hole, i) => {
        if (hole.noReturn) return; // out of the nett total; scores 0 Stableford either way
        if (hole.strokes == null) return;
        const holeNett = hole.strokes - received[i];
        nett += holeNett;
        points += stablefordPoints(holeNett, holeInfos[i].par);
      });
      const nettMatches = nett === card.nettTotal;
      const pointsMatch = card.stablefordTotal == null || points === card.stablefordTotal;
      if (nettMatches && pointsMatch) candidates.push(handicap);
    }

    if (candidates.length === 1) solved.push({ ...base, handicap: candidates[0] });
    else if (candidates.length > 1) ambiguous.push({ ...base, candidates, note: "every candidate reproduces this card identically -- set one by hand if you know it" });
    else noSolution.push({ ...base, reason: "no handicap from 0 to 40 reproduces the stored nett; the card may have been edited since" });
  }

  if (!confirmed) {
    return NextResponse.json({
      dryRun: true,
      message: "Nothing changed. Re-run with &confirm=SOLVE to write the uniquely solved ones.",
      summary: { solved: solved.length, ambiguous: ambiguous.length, noSolution: noSolution.length },
      solved,
      ambiguous,
      noSolution,
    });
  }

  const errors: { id: string; error: string }[] = [];
  let updated = 0;
  for (const row of solved) {
    try {
      await payload.update({
        collection: "scorecards",
        id: String(row.id),
        data: { playingHandicap: row.handicap as number },
        context: { suppressLiveBlog: true },
      });
      updated++;
    } catch (err) {
      errors.push({ id: String(row.id), error: err instanceof Error ? err.message : "failed" });
    }
  }

  return NextResponse.json({ updated, errors, ambiguous, noSolution });
}
