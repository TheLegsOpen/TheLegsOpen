import type { Competition, CompetitionEntry } from "@/lib/data/scorecards";

export interface TrackerMember {
  playerId: string;
  playerName: string;
  position: number;
  margin: number;
}

export interface RaceTracker {
  competition: Competition;
  /** More than one id = a share of the lead. Empty if nobody in the field has started. */
  leaderIds: string[];
  leaderName: string | undefined;
  /** Score/points value of the lead, for commentary (to-par for main/scratch, points for stableford). */
  leaderMetric: number | undefined;
  /** Gap between the leader(s) and the next-best distinct score. 0 if nobody else has started. */
  leadMargin: number;
  members: TrackerMember[];
}

export type RaceEventKind = "new-leader" | "tie-for-lead" | "lead-extends" | "entering-contention" | "leaving-contention";

export interface RaceCandidate {
  kind: RaceEventKind;
  competition: Competition;
  playerId: string;
  playerName: string;
  /** to-par for main/scratch, points for stableford. */
  scoreValue: number;
  leadMargin?: number;
}

/** How many holes (or points, for Stableford) back of the lead still counts as "in the race". Main tightens on the closing holes. */
function contentionMargin(competition: Competition, holesRemaining: number): number {
  if (competition === "stableford") return 5;
  if (competition === "scratch") return 3;
  return holesRemaining <= 6 ? 1 : 3;
}

function holesRemaining(entry: CompetitionEntry): number {
  if (entry.thru === "F") return 0;
  const played = Number(entry.thru);
  return 18 - (Number.isFinite(played) ? played : 0);
}

/** Higher is better for Stableford points; lower (more under par) is better for Main/Scratch. */
function metricValue(entry: CompetitionEntry, competition: Competition): number {
  return competition === "stableford" ? (entry.score ?? 0) : (entry.toPar ?? 0);
}

/** Strokes/points behind the lead -- 0 for the leader(s), always >= 0 for everyone else. */
function marginBehind(value: number, leaderValue: number, competition: Competition): number {
  return competition === "stableford" ? leaderValue - value : value - leaderValue;
}

/**
 * Builds the current Race Tracker for one competition. Only players who have posted at least
 * one score count -- otherwise every not-yet-teed-off player would read as "tied for the lead
 * at level par" before the field is even out. No-return (disqualified) players are excluded too --
 * their `toPar`/`score` is deliberately `undefined` so the real leaderboard sorts them to the
 * bottom, but `metricValue`'s `?? 0` fallback would otherwise read that as "level par" and could
 * wrongly crown a DQ'd player as leader or tied for the lead.
 *
 * `priorMemberIds`, when passed, applies one step of hysteresis: a player already in the
 * tracker is only dropped once they fall a full stroke/point beyond the normal entry margin,
 * so a borderline player doesn't flicker in and out as other scores move around them by one
 * shot. This is a single-step damper (based on the immediately preceding snapshot), not
 * persisted multi-hole stickiness -- see race-events.ts for how it's wired between saves.
 */
export function buildRaceTracker(entries: CompetitionEntry[], competition: Competition, priorMemberIds?: Set<string>): RaceTracker {
  const started = entries.filter((e) => e.started && !e.noReturn);
  if (started.length === 0) {
    return { competition, leaderIds: [], leaderName: undefined, leaderMetric: undefined, leadMargin: 0, members: [] };
  }

  const leaderValue = started.reduce(
    (best, e) => {
      const v = metricValue(e, competition);
      const better = competition === "stableford" ? v > best : v < best;
      return better ? v : best;
    },
    metricValue(started[0], competition),
  );

  const leaders = started.filter((e) => metricValue(e, competition) === leaderValue);
  const leaderIds = leaders.map((e) => e.player.id);

  const behindValues = started
    .filter((e) => !leaderIds.includes(e.player.id))
    .map((e) => marginBehind(metricValue(e, competition), leaderValue, competition));
  const leadMargin = behindValues.length > 0 ? Math.min(...behindValues) : 0;

  const members = started
    .filter((e) => {
      const margin = marginBehind(metricValue(e, competition), leaderValue, competition);
      const enterMargin = contentionMargin(competition, holesRemaining(e));
      const wasIn = priorMemberIds?.has(e.player.id) ?? false;
      const threshold = wasIn ? enterMargin + 1 : enterMargin;
      return margin <= threshold;
    })
    .map((e) => ({
      playerId: e.player.id,
      playerName: e.player.name,
      position: e.position,
      margin: marginBehind(metricValue(e, competition), leaderValue, competition),
    }));

  return { competition, leaderIds, leaderName: leaders[0]?.player.name, leaderMetric: leaderValue, leadMargin, members };
}

export type MovementEventKind = "enter-top-5" | "enter-top-10" | "big-gain" | "big-drop";

export interface MovementCandidate {
  kind: MovementEventKind;
  playerId: string;
  playerName: string;
  beforePosition: number;
  position: number;
  positionsChanged: number;
}

const BIG_MOVE_THRESHOLD = 5;

/**
 * One player's position change on a single leaderboard (Main only, in practice -- see
 * generate.ts) between the before/after snapshot. Only fires for genuinely large swings: moving
 * into the top 5 or top 10, or a 5+ position gain/drop -- small week-to-week jitter in a 36-40
 * player field isn't worth a post. Both entries must be `started`, so a not-yet-teed-off
 * player's baseline sort position doesn't register as a "move" once they actually begin.
 */
export function diffPositionMovement(
  beforeEntries: CompetitionEntry[],
  afterEntries: CompetitionEntry[],
  playerId: string,
): MovementCandidate | undefined {
  const before = beforeEntries.find((e) => e.player.id === playerId);
  const after = afterEntries.find((e) => e.player.id === playerId);
  if (!before || !after || !before.started || !after.started) return undefined;

  const gained = before.position - after.position;
  if (gained > 0) {
    const base = { playerId, playerName: after.player.name, beforePosition: before.position, position: after.position, positionsChanged: gained };
    if (before.position > 5 && after.position <= 5) return { ...base, kind: "enter-top-5" };
    if (before.position > 10 && after.position <= 10) return { ...base, kind: "enter-top-10" };
    if (gained >= BIG_MOVE_THRESHOLD) return { ...base, kind: "big-gain" };
    return undefined;
  }

  const dropped = after.position - before.position;
  if (dropped >= BIG_MOVE_THRESHOLD) {
    return { kind: "big-drop", playerId, playerName: after.player.name, beforePosition: before.position, position: after.position, positionsChanged: dropped };
  }
  return undefined;
}

/** Compares a before/after pair of trackers for the same competition and returns the meaningful transitions. */
export function diffRaceTrackers(before: RaceTracker, after: RaceTracker): RaceCandidate[] {
  const candidates: RaceCandidate[] = [];
  if (after.leaderIds.length === 0) return candidates;

  const beforeLeaderSet = new Set(before.leaderIds);
  const becameSoleLeader =
    after.leaderIds.length === 1 && (before.leaderIds.length !== 1 || before.leaderIds[0] !== after.leaderIds[0]);
  if (becameSoleLeader) {
    const id = after.leaderIds[0];
    candidates.push({
      kind: "new-leader",
      competition: after.competition,
      playerId: id,
      playerName: after.leaderName ?? "",
      scoreValue: after.leaderMetric ?? 0,
    });
  }

  if (after.leaderIds.length > 1) {
    for (const id of after.leaderIds.filter((i) => !beforeLeaderSet.has(i))) {
      const member = after.members.find((m) => m.playerId === id);
      candidates.push({
        kind: "tie-for-lead",
        competition: after.competition,
        playerId: id,
        playerName: member?.playerName ?? "",
        scoreValue: after.leaderMetric ?? 0,
      });
    }
  }

  const sameSoleLeader = after.leaderIds.length === 1 && before.leaderIds.length === 1 && after.leaderIds[0] === before.leaderIds[0];
  if (sameSoleLeader && after.leadMargin > before.leadMargin) {
    candidates.push({
      kind: "lead-extends",
      competition: after.competition,
      playerId: after.leaderIds[0],
      playerName: after.leaderName ?? "",
      scoreValue: after.leaderMetric ?? 0,
      leadMargin: after.leadMargin,
    });
  }

  const beforeMemberIds = new Set(before.members.map((m) => m.playerId));
  for (const m of after.members) {
    if (!beforeMemberIds.has(m.playerId)) {
      candidates.push({ kind: "entering-contention", competition: after.competition, playerId: m.playerId, playerName: m.playerName, scoreValue: 0 });
    }
  }

  const afterMemberIds = new Set(after.members.map((m) => m.playerId));
  for (const m of before.members) {
    if (!afterMemberIds.has(m.playerId)) {
      candidates.push({ kind: "leaving-contention", competition: before.competition, playerId: m.playerId, playerName: m.playerName, scoreValue: 0 });
    }
  }

  return candidates;
}
