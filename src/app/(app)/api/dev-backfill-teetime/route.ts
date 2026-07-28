import { NextResponse } from "next/server";
import { getPayload } from "payload";

import configPromise from "@/payload.config";

export async function GET() {
  const payload = await getPayload({ config: configPromise });

  const all = await payload.find({ collection: "scorecards", limit: 300, depth: 0 });
  const results = [];
  for (const doc of all.docs) {
    const playerId = typeof doc.player === "object" ? doc.player.id : doc.player;
    const championshipId = typeof doc.championship === "object" ? doc.championship.id : doc.championship;
    const updated = await payload.update({
      collection: "scorecards",
      id: doc.id,
      data: { player: playerId as string, championship: championshipId as string },
    });
    results.push({ id: updated.id, player: playerId, teeTime: updated.teeTime });
  }

  return NextResponse.json({ count: results.length, results });
}
