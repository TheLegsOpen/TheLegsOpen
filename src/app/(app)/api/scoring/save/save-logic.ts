import type { ScoringSessionPayload } from "@/lib/scoring-session";

/**
 * The actual write logic behind /api/scoring/save, pulled out of the route handler so it's
 * directly testable against the fake-payload harness (src/lib/live-blog/__fixtures__/fake-payload.ts)
 * without needing a real Payload instance. Structurally typed against just the three Local API
 * methods it actually calls, loosely enough that both the real `payload` and the fake one satisfy
 * it -- Payload's own generated per-collection generics aren't worth fighting here.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ScoringPayloadClient {
  findByID: (args: { collection: string; id: string }) => Promise<Record<string, unknown>>;
  find: (args: { collection: string; where?: unknown; limit?: number }) => Promise<{ docs: Record<string, unknown>[] }>;
  update: (args: { collection: string; id: string; data: Record<string, unknown> }) => Promise<Record<string, unknown>>;
}

export interface HoleUpdateInput {
  scorecardId: string;
  holeNumber: number;
  strokes?: number;
  noReturn?: boolean;
}

export interface SaveScoresResult {
  applied: { scorecardId: string; holeNumber: number; holesCompleted?: number }[];
  rejected: { scorecardId: string; holeNumber: number; reason: string }[];
}

interface Group {
  id?: string | null;
  pinVersion?: number | null;
  players?: (string | { id: string | number })[] | null;
}

/**
 * Re-derives which scorecards this session is allowed to touch fresh from the database on every
 * call -- never trusts the client-supplied scorecardId alone. The session token itself carries no
 * player/scorecard IDs (see scoring-session.ts), only the group's identity, specifically so a
 * stolen or guessed token can never be replayed against a different group's scores, and so an
 * admin correcting a group's player list takes effect on the very next save with no re-login
 * needed.
 */
export async function saveScores(payload: ScoringPayloadClient, session: ScoringSessionPayload, updates: HoleUpdateInput[]): Promise<SaveScoresResult> {
  const result: SaveScoresResult = { applied: [], rejected: [] };
  if (updates.length === 0) return result;

  const round = await payload.findByID({ collection: "tee-time-rounds", id: session.teeTimeRoundId }).catch(() => undefined);
  const group = ((round?.groups as Group[] | undefined) ?? []).find((g) => String(g.id) === session.groupId);

  if (!group || (group.pinVersion ?? 1) !== session.pinVersion) {
    for (const u of updates) result.rejected.push({ scorecardId: u.scorecardId, holeNumber: u.holeNumber, reason: "session no longer valid -- log in again" });
    return result;
  }

  const playerIds = new Set((group.players ?? []).map((p) => String(typeof p === "object" ? p.id : p)));

  const scorecards = await payload.find({
    collection: "scorecards",
    where: { and: [{ championship: { equals: session.championshipId } }, { player: { in: Array.from(playerIds) } }] },
    limit: playerIds.size + 5,
  });
  const scorecardById = new Map(scorecards.docs.map((doc) => [String(doc.id), doc]));

  for (const update of updates) {
    const card = scorecardById.get(update.scorecardId);
    if (!card || update.holeNumber < 1 || update.holeNumber > 18) {
      result.rejected.push({ scorecardId: update.scorecardId, holeNumber: update.holeNumber, reason: "not a scorecard in this group" });
      continue;
    }

    const holes = [...((card.holes as Record<string, unknown>[] | undefined) ?? [])];
    const index = update.holeNumber - 1;
    holes[index] = {
      ...(holes[index] ?? {}),
      holeNumber: update.holeNumber,
      strokes: update.noReturn ? undefined : update.strokes,
      noReturn: Boolean(update.noReturn),
    };

    // Deliberately no context.suppressLiveBlog -- the opposite of admin-scoring/save's bulk
    // backfill tool. On-course entry is real-time play, so generateLiveBlogPosts (Scorecards'
    // own afterChange hook) must fire exactly as it would for an admin typing a score in live.
    const updated = await payload.update({ collection: "scorecards", id: update.scorecardId, data: { holes } });
    result.applied.push({ scorecardId: update.scorecardId, holeNumber: update.holeNumber, holesCompleted: updated.holesCompleted as number | undefined });
  }

  return result;
}
