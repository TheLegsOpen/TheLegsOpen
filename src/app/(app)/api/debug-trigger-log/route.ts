import { NextResponse } from "next/server";
import { getPayload } from "payload";

import configPromise from "@/payload.config";

/** TEMPORARY, read-only diagnostic route -- inspects trigger-log rows and venue hole pars for the
 * active championship. Not linked from anywhere in the UI. Delete this file after use. */
export async function GET() {
  const payload = await getPayload({ config: configPromise });

  const active = await payload.find({ collection: "championships", where: { isActive: { equals: true } }, limit: 1, depth: 1 });
  const championship = active.docs[0];
  if (!championship) return NextResponse.json({ error: "No active championship" }, { status: 404 });

  const venueId = typeof championship.venue === "object" ? championship.venue?.id : championship.venue;
  const venue = venueId ? await payload.findByID({ collection: "venues", id: venueId, depth: 0 }) : undefined;

  const playerResult = await payload.find({ collection: "players", where: { name: { equals: "Mark Alston" } }, limit: 1, depth: 0 });
  const player = playerResult.docs[0];

  const log = await payload.find({
    collection: "live-blog-trigger-log",
    where: { and: [{ championship: { equals: championship.id } }, player ? { player: { equals: player.id } } : {}] },
    sort: "-evaluatedAt",
    limit: 30,
    depth: 0,
  });

  return NextResponse.json({
    hole5Par: venue?.holes?.[4]?.par,
    allPars: venue?.holes?.map((h: { par: number }) => h.par),
    playerId: player?.id,
    triggerLog: log.docs.map((d) => ({
      category: d.category,
      holeNumber: d.holeNumber,
      significance: d.significance,
      threshold: d.threshold,
      selected: d.selected,
      suppressed: d.suppressed,
      suppressionReason: d.suppressionReason,
      evaluatedAt: d.evaluatedAt,
    })),
  });
}
