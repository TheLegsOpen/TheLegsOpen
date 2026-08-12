import type { PayloadRequest } from "payload";

export interface CourseRecordHolder {
  scorecardId: string;
  playerName: string;
  year: number;
  grossTotal: number;
  toParGross: number;
  /** Raw gross strokes per hole, in order -- used to compute the record round's own pace through N holes (see toParGrossThroughHole) so a live player's progress can be compared against it directly. */
  holeStrokes: (number | undefined)[];
}

/**
 * The lowest complete, valid (no-return-free) gross round ever recorded at this venue, from any
 * PRIOR championship held there -- deliberately excludes the current championship entirely, not
 * just the live scorecard being saved. A "course record" is a multi-year, headline-rare thing;
 * without this, a venue's very first-ever event would spend the whole day "breaking" its own
 * still-forming record against whichever mediocre round happened to finish first that morning --
 * real, but meaningless noise, not the story this category exists to tell. From a venue's second
 * staging onward this compares against a genuinely separate, complete historical event instead.
 */
export async function getCourseRecord(
  req: PayloadRequest,
  venueId: string | number,
  currentChampionshipId: string | number,
): Promise<CourseRecordHolder | null> {
  const championships = await req.payload.find({
    collection: "championships",
    where: { and: [{ venue: { equals: venueId } }, { id: { not_equals: currentChampionshipId } }] },
    limit: 100,
    depth: 0,
    req,
  });
  const championshipIds = championships.docs.map((c) => c.id);
  if (championshipIds.length === 0) return null;

  const scorecards = await req.payload.find({
    collection: "scorecards",
    where: {
      and: [
        { championship: { in: championshipIds } },
        { holesCompleted: { equals: 18 } },
        { noReturn: { not_equals: true } },
      ],
    },
    sort: "grossTotal",
    limit: 1,
    depth: 1,
    req,
  });

  const best = scorecards.docs[0];
  if (!best) return null;

  const championshipRef = typeof best.championship === "object" ? best.championship?.id : best.championship;
  const championship = championships.docs.find((c) => String(c.id) === String(championshipRef));
  const player = typeof best.player === "object" ? best.player : null;

  return {
    scorecardId: String(best.id),
    playerName: player?.name ?? "Unknown",
    year: championship?.year ?? 0,
    grossTotal: best.grossTotal ?? 0,
    toParGross: best.toParGross ?? 0,
    holeStrokes: (best.holes ?? []).map((h) => h.strokes ?? undefined),
  };
}

/** Cumulative gross-to-par for exactly the first `holeNumber` holes of a stored round -- undefined
 * if any of them is missing strokes. Mirrors generate.ts's toParThroughHole, but works from raw
 * hole strokes + venue pars (a past CourseRecordHolder round) rather than a live CompetitionEntry. */
export function toParGrossThroughHole(holeStrokes: (number | undefined)[], venueHoles: { par?: number | null }[], holeNumber: number): number | undefined {
  let total = 0;
  for (let i = 0; i < holeNumber; i++) {
    const strokes = holeStrokes[i];
    if (strokes == null) return undefined;
    total += strokes - (venueHoles[i]?.par ?? 4);
  }
  return total;
}
