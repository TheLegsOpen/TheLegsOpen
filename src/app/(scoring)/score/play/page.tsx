import { cookies, headers as getHeaders } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

import config from "@/payload.config";
import {
  verifyScoringSession,
  SCORING_SESSION_COOKIE,
} from "@/lib/scoring-session";
import {
  ScoringApp,
  type ScoringGroupData,
} from "@/components/scoring/scoring-app";
import { FinishRoundButton } from "@/components/scoring/finish-round-button";
import { Button } from "@/components/ui/button";
import type { Venue, Player, Scorecard } from "@/payload-types";

// See src/app/(app)/page.tsx for why this route is force-dynamic.
export const dynamic = "force-dynamic";

export default async function ScorePlayPage() {
  const cookieStore = await cookies();
  const session = await verifyScoringSession(
    cookieStore.get(SCORING_SESSION_COOKIE)?.value,
  );
  if (!session) redirect("/score/login");

  const payload = await getPayload({ config });

  // Shown only when this session was created through the admin group picker, which is recorded on
  // the session itself. It used to test for a Payload cookie, but an admin signing in with a PIN on
  // their own phone still has that cookie from the admin site and was shown a link a scorer must
  // never see.
  const canSwitchGroup = Boolean(session.viaAdmin);

  const round = await payload
    .findByID({
      collection: "tee-time-rounds",
      id: session.teeTimeRoundId,
      depth: 1,
    })
    .catch(() => undefined);
  const group = round?.groups?.find((g) => String(g.id) === session.groupId);
  if (!round || !group || (group.pinVersion ?? 1) !== session.pinVersion)
    redirect("/score/login");

  // Practice sessions (no championshipId) get their venue straight off the round's own Course
  // field; Championship sessions keep resolving it via the championship, unchanged from before.
  let venue: Venue | undefined;
  const isChampionshipRound = round?.round === "Championship";
  if (isChampionshipRound && session.championshipId) {
    const championship = await payload
      .findByID({
        collection: "championships",
        id: session.championshipId,
        depth: 1,
      })
      .catch(() => undefined);
    venue =
      championship && typeof championship.venue === "object"
        ? (championship.venue as Venue)
        : undefined;
  } else {
    venue =
      typeof round.venue === "object" ? (round.venue as Venue) : undefined;
  }
  const holeInfos = Array.from({ length: 18 }, (_, i) => ({
    par: venue?.holes?.[i]?.par ?? 4,
    si: venue?.holes?.[i]?.si ?? i + 1,
    // Optional on Venues, so it stays optional here -- the header omits it rather than showing 0.
    yards: venue?.holes?.[i]?.yards ?? undefined,
  }));

  const players = (group.players ?? []).filter(
    (p): p is Player => typeof p === "object",
  );
  const playerIds = players.map((p) => String(p.id));

  const scorecards = await payload.find({
    collection: "scorecards",
    where:
      isChampionshipRound && session.championshipId
        ? {
            and: [
              { championship: { equals: session.championshipId } },
              { player: { in: playerIds } },
            ],
          }
        : {
            and: [
              { teeTimeRound: { equals: session.teeTimeRoundId } },
              { player: { in: playerIds } },
            ],
          },
    limit: playerIds.length + 5,
    depth: 0,
  });
  const scorecardByPlayerId = new Map(
    (scorecards.docs as Scorecard[]).map((doc) => [
      String(
        typeof doc.player === "object" ? (doc.player as Player).id : doc.player,
      ),
      doc,
    ]),
  );

  const groupData: ScoringGroupData = {
    groupLabel: `${group.time} · ${group.tee} tee`,
    venueName: venue?.name,
    holeInfos,
    players: players
      .map((player) => {
        const card = scorecardByPlayerId.get(String(player.id));
        if (!card) return undefined;
        const holes = Array.from({ length: 18 }, (_, i) => {
          const hole = card.holes?.[i];
          return {
            strokes: hole?.strokes ?? undefined,
            noReturn: Boolean(hole?.noReturn),
          };
        });
        return {
          playerId: String(player.id),
          playerName: player.name,
          scorecardId: String(card.id),
          holes,
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== undefined),
  };

  /**
   * Once every player has all 18 holes in, the card is finished and this stops being an entry
   * screen.
   *
   * Without this, a scorer who has confirmed their round can walk back into it with the browser's
   * back button and change a result that is already on the leaderboard. There is no new field
   * recording "confirmed" -- a complete card is the same fact, and adding a column to a collection
   * is not something to do days before a championship.
   *
   * An X counts as played, so a no-return round still closes properly.
   */
  const roundComplete =
    groupData.players.length > 0 &&
    groupData.players.every((player) =>
      player.holes.every((hole) => hole.strokes !== undefined || hole.noReturn),
    );

  if (roundComplete) {
    return (
      <div className="flex h-[100svh] flex-col justify-center gap-6 p-6 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-3xl font-bold">Card complete</h1>
          <p className="text-base text-primary-foreground/70">
            {groupData.groupLabel} is in. Any change from here has to be made by
            an administrator.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Button
            asChild
            variant="accent"
            size="lg"
            className="w-full uppercase tracking-wide"
          >
            <Link href="/score/leaderboard">View Leaderboard</Link>
          </Button>
          <FinishRoundButton roundComplete />
        </div>
      </div>
    );
  }

  return <ScoringApp group={groupData} canSwitchGroup={canSwitchGroup} />;
}
