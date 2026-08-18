import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";

import configPromise from "@/payload.config";

/**
 * One-shot, temporary route: flips the 2014 championship's "Completed" checkbox true, which
 * triggers Championships.ts's own beforeValidate hook (computeChampionshipAutoStats) to derive
 * and fill winner/margin/Stableford-Scratch winners/etc straight from the real scorecard data
 * already entered -- no fields are set by hand here. Never committed/deployed long-term --
 * deleted once confirmed applied.
 */
export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.TEMP_BACKFILL_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await getPayload({ config: configPromise });
  const updated = await payload.update({ collection: "championships", id: "16", data: { completed: true } });

  return NextResponse.json({
    done: true,
    year: updated.year,
    completed: updated.completed,
    winnerName: updated.winnerName,
    winnerCountry: updated.winnerCountry,
    winningScore: updated.winningScore,
    scoreToPar: updated.scoreToPar,
    margin: updated.margin,
    stablefordWinnerName: updated.stablefordWinnerName,
    scratchWinnerName: updated.scratchWinnerName,
    runnerUpName: updated.runnerUpName,
    runnerUpScore: updated.runnerUpScore,
  });
}
