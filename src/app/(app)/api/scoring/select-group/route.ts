import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";

import config from "@/payload.config";
import { issueGroupSessionResponse } from "@/lib/scoring-group-session";
import type { TeeTimeRound } from "@/payload-types";

/**
 * Lets an already-authenticated Payload admin (see /score/groups) drop straight into scoring a
 * chosen group without a PIN -- issues the exact same scorer_session cookie a PIN login would, so
 * /score/play and /api/scoring/save don't need to know or care which path a session came from.
 */
export async function POST(request: NextRequest) {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: request.headers });
  if (!user) {
    return NextResponse.json({ error: "Your admin session has expired — log in again." }, { status: 401 });
  }

  const { teeTimeRoundId, groupId } = (await request.json().catch(() => ({}))) as {
    teeTimeRoundId?: string;
    groupId?: string;
  };
  if (!teeTimeRoundId || !groupId) {
    return NextResponse.json({ error: "Missing group selection." }, { status: 400 });
  }

  const round = (await payload.findByID({ collection: "tee-time-rounds", id: teeTimeRoundId, depth: 1 }).catch(() => undefined)) as
    | TeeTimeRound
    | undefined;
  const group = round?.groups?.find((g) => String(g.id) === groupId);
  const championshipId = round && typeof round.championship === "object" ? round.championship?.id : round?.championship;

  if (!round || !group || !championshipId) {
    return NextResponse.json({ error: "That group couldn't be found." }, { status: 404 });
  }

  return issueGroupSessionResponse(round, group, String(championshipId));
}
