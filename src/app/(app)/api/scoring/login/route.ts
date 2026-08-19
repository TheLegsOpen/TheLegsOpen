import { NextResponse } from "next/server";
import { getPayload } from "payload";

import config from "@/payload.config";
import { issueGroupSessionResponse } from "@/lib/scoring-group-session";
import type { TeeTimeRound } from "@/payload-types";

/**
 * PIN login for the on-course scoring app. Deliberately independent of Payload's admin auth --
 * see src/lib/scoring-session.ts. Finds the group by PIN across every non-archived Championship
 * round (PINs are generated globally unique, see TeeTimeRounds.ts's beforeValidate hook), issues
 * a signed session scoped to that one group, and returns just enough for an immediate "logged in
 * as this group" confirmation -- the actual scoring data is loaded fresh by /score/play itself.
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
      and: [{ round: { equals: "Championship" } }, { archived: { not_equals: true } }, { "groups.pin": { equals: normalizedPin } }],
    },
    limit: 1,
    depth: 1,
  });

  const round = rounds.docs[0] as TeeTimeRound | undefined;
  const group = round?.groups?.find((g) => g.pin === normalizedPin);
  const championshipId = round && typeof round.championship === "object" ? round.championship?.id : round?.championship;

  if (!round || !group || !championshipId) {
    return NextResponse.json({ error: "That PIN wasn't recognised. Check with the organiser and try again." }, { status: 401 });
  }

  return issueGroupSessionResponse(round, group, String(championshipId));
}
