import { NextResponse } from "next/server";
import { getPayload } from "payload";

import config from "@/payload.config";
import { issueGroupSessionResponse } from "@/lib/scoring-group-session";
import type { TeeTimeRound } from "@/payload-types";

/**
 * PIN login for the on-course scoring app. Deliberately independent of Payload's admin auth --
 * see src/lib/scoring-session.ts. Finds the group by PIN across every non-archived Championship
 * or Practice round (PINs are generated globally unique, see TeeTimeRounds.ts's beforeValidate
 * hook), issues a signed session scoped to that one group, and returns just enough for an
 * immediate "logged in as this group" confirmation -- the actual scoring data is loaded fresh by
 * /score/play itself.
 */
export async function POST(request: Request) {
  const { pin } = (await request.json().catch(() => ({}))) as { pin?: string };
  const normalizedPin = (pin ?? "").trim().toUpperCase();
  if (!normalizedPin) {
    return NextResponse.json({ error: "Enter a PIN." }, { status: 400 });
  }

  const payload = await getPayload({ config });

  const rounds = await payload.find({
    collection: "tee-time-rounds",
    where: {
      and: [{ archived: { not_equals: true } }, { "groups.pin": { equals: normalizedPin } }],
    },
    limit: 1,
    depth: 1,
  });

  const round = rounds.docs[0] as TeeTimeRound | undefined;
  const group = round?.groups?.find((g) => g.pin === normalizedPin);
  // A Practice round is scored against itself, never against a championship -- even though it
  // usually HAS one set, since Championship is how a practice day is filed under the year it
  // belongs to. Keying off that field instead of the round type is what sent Friday's scores into
  // Saturday's scorecards, and resolved Friday's par/SI from the championship venue rather than the
  // round's own Course.
  const isChampionshipRound = round?.round === "Championship";
  const rawChampionshipId = round && typeof round.championship === "object" ? round.championship?.id : round?.championship;
  const championshipId = isChampionshipRound ? rawChampionshipId : undefined;

  if (!round || !group) {
    return NextResponse.json({ error: "That PIN wasn't recognised. Check with the organiser and try again." }, { status: 401 });
  }

  return issueGroupSessionResponse(round, group, championshipId ? String(championshipId) : undefined);
}
