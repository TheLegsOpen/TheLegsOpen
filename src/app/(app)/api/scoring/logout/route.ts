import { NextResponse } from "next/server";

import { SCORING_SESSION_COOKIE } from "@/lib/scoring-session";

/**
 * Ends a scorer's session.
 *
 * Signing out matters more here than it looks: without it, a scorer who has confirmed their card
 * can still reach /score/play with the browser's back button and carry on editing a round that is
 * supposed to be closed. The cookie is cleared with the same path it was set on ("/" -- see
 * scoring-group-session.ts), since a mismatched path leaves the original in place.
 */
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SCORING_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
