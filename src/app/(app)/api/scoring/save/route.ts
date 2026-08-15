import { NextResponse } from "next/server";
import { getPayload } from "payload";
import { cookies } from "next/headers";

import config from "@/payload.config";
import { verifyScoringSession, SCORING_SESSION_COOKIE } from "@/lib/scoring-session";
import { saveScores, type HoleUpdateInput, type ScoringPayloadClient } from "./save-logic";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const session = await verifyScoringSession(cookieStore.get(SCORING_SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "Session expired -- log in again." }, { status: 401 });
  }

  const { updates } = (await request.json().catch(() => ({}))) as { updates?: HoleUpdateInput[] };
  if (!Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json({ error: "No updates provided." }, { status: 400 });
  }

  const payload = await getPayload({ config });
  // Payload's Local API is typed with narrow per-collection generics; saveScores is deliberately
  // typed against a minimal structural interface instead so it also runs against the fake-payload
  // test harness (see save-logic.ts) -- the real client satisfies that interface at runtime.
  const result = await saveScores(payload as unknown as ScoringPayloadClient, session, updates);

  return NextResponse.json(result, { status: result.rejected.length > 0 && result.applied.length === 0 ? 403 : 200 });
}
