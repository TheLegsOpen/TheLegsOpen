import { cookies, headers as getHeaders } from "next/headers";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

import config from "@/payload.config";
import { verifyScoringSession, SCORING_SESSION_COOKIE } from "@/lib/scoring-session";
import { ScoringApp, type ScoringGroupData } from "@/components/scoring/scoring-app";
import type { Venue, Player, Scorecard } from "@/payload-types";

export default async function ScorePlayPage() {
  const cookieStore = await cookies();
  const session = await verifyScoringSession(cookieStore.get(SCORING_SESSION_COOKIE)?.value);
  if (!session) redirect("/score/login");

  const payload = await getPayload({ config });

  // Shown a "Switch group" link only when they *also* hold a real Payload session -- i.e. they
  // got here via the admin group picker, not a PIN. A PIN-only scorer never has this cookie.
  const { user } = await payload.auth({ headers: await getHeaders() });
  const canSwitchGroup = Boolean(user);

  const round = await payload.findByID({ collection: "tee-time-rounds", id: session.teeTimeRoundId, depth: 1 }).catch(() => undefined);
  const group = round?.groups?.find((g) => String(g.id) === session.groupId);
  if (!round || !group || (group.pinVersion ?? 1) !== session.pinVersion) redirect("/score/login");

  const championship = await payload.findByID({ collection: "championships", id: session.championshipId, depth: 1 }).catch(() => undefined);
  const venue = championship && typeof championship.venue === "object" ? (championship.venue as Venue) : undefined;
  const holeInfos = Array.from({ length: 18 }, (_, i) => ({
    par: venue?.holes?.[i]?.par ?? 4,
    si: venue?.holes?.[i]?.si ?? i + 1,
  }));

  const players = (group.players ?? []).filter((p): p is Player => typeof p === "object");
  const playerIds = players.map((p) => String(p.id));

  const scorecards = await payload.find({
    collection: "scorecards",
    where: { and: [{ championship: { equals: session.championshipId } }, { player: { in: playerIds } }] },
    limit: playerIds.length + 5,
    depth: 0,
  });
  const scorecardByPlayerId = new Map(
    (scorecards.docs as Scorecard[]).map((doc) => [String(typeof doc.player === "object" ? (doc.player as Player).id : doc.player), doc]),
  );

  const groupData: ScoringGroupData = {
    groupLabel: `${group.time} · ${group.tee} tee`,
    holeInfos,
    players: players
      .map((player) => {
        const card = scorecardByPlayerId.get(String(player.id));
        if (!card) return undefined;
        const holes = Array.from({ length: 18 }, (_, i) => {
          const hole = card.holes?.[i];
          return { strokes: hole?.strokes ?? undefined, noReturn: Boolean(hole?.noReturn) };
        });
        return { playerId: String(player.id), playerName: player.name, scorecardId: String(card.id), holes };
      })
      .filter((p): p is NonNullable<typeof p> => p !== undefined),
  };

  return <ScoringApp group={groupData} canSwitchGroup={canSwitchGroup} />;
}
