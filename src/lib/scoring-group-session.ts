import { NextResponse } from "next/server";

import { issueScoringSession, SCORING_SESSION_COOKIE } from "@/lib/scoring-session";
import type { TeeTimeRound, Player } from "@/payload-types";

/**
 * Builds the same scorer_session cookie a PIN login issues, from an already-resolved round/group
 * -- shared by /api/scoring/login (PIN lookup) and /api/scoring/select-group (admin picking a
 * group directly) so /score/play and /api/scoring/save never need to know which path a session
 * came from.
 */
export async function issueGroupSessionResponse(
  round: TeeTimeRound,
  group: NonNullable<TeeTimeRound["groups"]>[number],
  championshipId: string,
): Promise<NextResponse> {
  // A round without a date shouldn't be reachable here (date is required on the collection), but
  // fall back to a short, safe default rather than crash if it somehow is.
  const roundDate = round.date ? new Date(round.date) : new Date();
  const roundBasedExpiry = new Date(roundDate);
  roundBasedExpiry.setDate(roundBasedExpiry.getDate() + 2);
  roundBasedExpiry.setHours(0, 0, 0, 0);
  // Backdating a historical championship's rounds (round.date in the past) would otherwise compute
  // an expiry years in the past too -- a cookie with a past Expires is dropped by the browser
  // immediately, so "login" would succeed but the session would never actually stick. Never expire
  // sooner than 2 days from now, regardless of how old the round being scored is.
  const minExpiry = new Date();
  minExpiry.setDate(minExpiry.getDate() + 2);
  const expiresAt = roundBasedExpiry > minExpiry ? roundBasedExpiry : minExpiry;

  const token = await issueScoringSession(
    {
      teeTimeRoundId: String(round.id),
      groupId: String(group.id),
      championshipId,
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
