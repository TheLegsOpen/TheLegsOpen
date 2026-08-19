import { NextResponse } from "next/server";
import { getPayload } from "payload";

import config from "@/payload.config";
import { issueScoringSession, SCORING_SESSION_COOKIE } from "@/lib/scoring-session";
import type { TeeTimeRound, Player } from "@/payload-types";

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

  // A round without a date shouldn't be reachable via a real PIN (date is required on the
  // collection), but fall back to a short, safe default rather than crash if it somehow is.
  const roundDate = round.date ? new Date(round.date) : new Date();
  const roundBasedExpiry = new Date(roundDate);
  roundBasedExpiry.setDate(roundBasedExpiry.getDate() + 2);
  roundBasedExpiry.setHours(0, 0, 0, 0);
  // Backdating a historical championship's PINs (round.date in the past) would otherwise compute
  // an expiry years in the past too -- a cookie with a past Expires is dropped by the browser
  // immediately, so login "succeeds" (200 + valid group) but the session never actually sticks,
  // and the next navigation looks like login just did nothing. Never expire sooner than 2 days
  // from now, regardless of how old the round being scored is.
  const minExpiry = new Date();
  minExpiry.setDate(minExpiry.getDate() + 2);
  const expiresAt = roundBasedExpiry > minExpiry ? roundBasedExpiry : minExpiry;

  const token = await issueScoringSession(
    {
      teeTimeRoundId: String(round.id),
      groupId: String(group.id),
      championshipId: String(championshipId),
      pinVersion: group.pinVersion ?? 1,
    },
    expiresAt,
  );

  const players = (group.players ?? []).filter((p): p is Player => typeof p === "object");

  const response = NextResponse.json({
    groupLabel: `${group.time} · ${group.tee} tee`,
    players: players.map((p) => ({ id: String(p.id), name: p.name })),
  });

  response.cookies.set(SCORING_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    // "/", not "/score" -- this cookie needs to reach both /score/* (the pages) and
    // /api/scoring/* (a different URL prefix entirely), so any narrower path drops one of them.
    path: "/",
    expires: expiresAt,
  });

  return response;
}
