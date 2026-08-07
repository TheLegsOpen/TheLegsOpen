import { headers as getHeaders } from "next/headers";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

import configPromise from "@/payload.config";
import { getActiveChampionship } from "@/lib/data/scorecards";
import { GroupScoringBoard, type ScoringGroup, type HoleInfo, type HoleValue } from "@/components/admin-scoring/group-scoring-board";
import type { Venue, Player, Scorecard } from "@/payload-types";

export const dynamic = "force-dynamic";

export default async function AdminScoringPage() {
  const payload = await getPayload({ config: configPromise });
  const headersList = await getHeaders();
  const { user } = await payload.auth({ headers: headersList });

  if (!user) {
    redirect("/admin/login?redirect=/admin-scoring");
  }

  const championship = await getActiveChampionship(payload);

  if (!championship) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="font-display text-2xl font-bold">Group Scoring</h1>
        <p className="mt-4 text-surface-dark-foreground/70">No championship found. Set one as &quot;Currently Being Scored&quot; in the admin first.</p>
      </main>
    );
  }

  const venue = typeof championship.venue === "object" ? (championship.venue as Venue) : undefined;
  const holeInfos: HoleInfo[] = Array.from({ length: 18 }, (_, i) => ({
    par: venue?.holes?.[i]?.par ?? 4,
    si: venue?.holes?.[i]?.si ?? i + 1,
    yards: venue?.holes?.[i]?.yards ?? undefined,
  }));

  const [teeTimeRounds, scorecards] = await Promise.all([
    payload.find({
      collection: "tee-time-rounds",
      where: { and: [{ championship: { equals: championship.id } }, { round: { equals: "Championship" } }] },
      limit: 50,
      depth: 1,
    }),
    payload.find({
      collection: "scorecards",
      where: { championship: { equals: championship.id } },
      limit: 300,
      depth: 1,
    }),
  ]);

  const scorecardByPlayerId = new Map<string, Scorecard>();
  for (const doc of scorecards.docs) {
    const playerId = typeof doc.player === "object" ? doc.player.id : doc.player;
    if (playerId != null) scorecardByPlayerId.set(String(playerId), doc as Scorecard);
  }

  const groups: ScoringGroup[] = [];
  for (const round of teeTimeRounds.docs) {
    for (const group of round.groups ?? []) {
      const players = (group.players ?? [])
        .map((p) => (typeof p === "object" ? (p as Player) : undefined))
        .filter((p): p is Player => Boolean(p))
        .map((player) => {
          const scorecard = scorecardByPlayerId.get(String(player.id));
          const holes: HoleValue[] = Array.from({ length: 18 }, (_, i) =>
            scorecard?.holes?.[i]?.noReturn ? "X" : (scorecard?.holes?.[i]?.strokes ?? null),
          );
          return {
            playerId: String(player.id),
            scorecardId: scorecard ? String(scorecard.id) : "",
            name: player.name,
            handicap: player.championshipHandicap ?? 0,
            holes,
          };
        })
        .filter((p) => p.scorecardId);

      if (players.length > 0) {
        groups.push({ time: group.time, tee: group.tee, players });
      }
    }
  }

  groups.sort((a, b) => a.time.localeCompare(b.time, undefined, { numeric: true }));

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-10">
      <h1 className="font-display text-2xl font-bold">Group Scoring — {championship.year}</h1>
      <p className="mt-2 text-sm text-surface-dark-foreground/70">
        Enter every player in a tee group&apos;s hole-by-hole gross strokes together, then save the whole group in one go.
      </p>
      <div className="mt-8">
        <GroupScoringBoard groups={groups} holeInfos={holeInfos} />
      </div>
    </main>
  );
}
