import type { CollectionAfterChangeHook, PayloadRequest } from "payload";

import { getCompetitionLeaderboard, getLeaderboardSnapshotPair, parseTeeTimeMinutes } from "@/lib/data/scorecards";
import { getLiveBlogConfig } from "@/lib/data/live-blog";
import { evaluateAndPublish, findLowerPriorityCandidates, type TriggerCandidate } from "@/lib/live-blog/publication-policy";
import { buildRaceTrackerCandidates } from "@/lib/live-blog/race-events";
import { buildWinnerConfirmedCandidates } from "@/lib/live-blog/winner-confirmed";
import { diffPositionMovement } from "@/lib/live-blog/race-tracker";
import {
  aceCommentary,
  albatrossCommentary,
  eagleCommentary,
  nettEagleCommentary,
  birdieCommentary,
  bogeyCommentary,
  doubleBogeyCommentary,
  bogeyMissLabel,
  birdieGainLabel,
  roundCompleteCommentary,
  competitionUnderwayCommentary,
  lastGroupOutCommentary,
  movingUpCommentary,
  chargeCommentary,
  hotStreakCommentary,
  birdieRunCommentary,
  movingDownCommentary,
  troubleCommentary,
  leaderFaltersCommentary,
  challengeFaltersCommentary,
  noReturnCommentary,
  enterTopCommentary,
  bigGainCommentary,
  bigDropCommentary,
  pressureMomentCommentary,
  throughCommentary,
  clubhouseLeaderCommentary,
  bestGrossRoundCommentary,
} from "@/lib/live-blog/commentary";
import type { Scorecard, Player, Championship, Venue, LiveBlogPost } from "@/payload-types";

/** "Leading, or within this many nett shots of the leader" -- the always-show threshold for the
 * four per-hole Main categories (nett eagle-or-better, birdie, bogey, double-bogey-or-worse) and
 * for Challenge Falters. Deliberately margin-based rather than position-based: a player 3 shots
 * back in 9th is still a real part of the story; someone 8 shots back in 4th (a thin, bunched
 * field) is not. */
const STRIKING_DISTANCE = 3;

/** Moving-up/charge's contention margin -- 4 shots through hole 14, tightening to 2 shots in the
 * closing stretch where the same climb matters more. */
function momentumMargin(holeNumber: number): number {
  return holeNumber >= 15 ? 2 : 4;
}

/** Moving-down/trouble's contention margin -- stops firing entirely from hole 15 on, superseded
 * by the more specific Leader Falters / Challenge Falters, which name exactly who is collapsing
 * rather than a generic "slipping down the board". */
const DOWNWARD_MOMENTUM_MARGIN = 4;
const DOWNWARD_MOMENTUM_LAST_HOLE = 14;

/** Leader/Challenge Falters both need at least this many bad holes in a row, from this hole on. */
const FALTERS_MIN_STREAK = 2;
const FALTERS_FROM_HOLE = 15;

/** Shared by the "through" thread (hole 10 onward) and the closing-stretch "pressure moment" --
 * leading or within this many shots of the leader qualifies for both. */
const WITHIN_TWO_SHOTS = 2;
const THROUGH_START_HOLE = 10;
const PRESSURE_WINDOW_START = 16;

/** The streak length at which "charge" (fires at exactly 3) escalates to its own, bigger story. */
const HOT_STREAK_LENGTH = 4;

/** Walks backward from `index` counting consecutive holes all under (or all over) par. Stops at the first unplayed or opposite-direction hole. */
function trailingStreak(relatives: (number | undefined)[], index: number, direction: "under" | "over"): number {
  let count = 0;
  for (let i = index; i >= 0; i--) {
    const r = relatives[i];
    if (r === undefined) break;
    if (direction === "under" && r > -1) break;
    if (direction === "over" && r < 1) break;
    count++;
  }
  return count;
}

/** Counts birdie-or-better holes among the last (up to) `windowSize` played holes ending at `index`, inclusive. */
function birdiesInWindow(relatives: (number | undefined)[], index: number, windowSize: number): number {
  let count = 0;
  let seen = 0;
  for (let i = index; i >= 0 && seen < windowSize; i--) {
    const r = relatives[i];
    if (r === undefined) break;
    seen++;
    if (r <= -1) count++;
  }
  return count;
}

/**
 * Fires whenever a Scorecard's holes are saved. Uses scoreUpdatedAt (only stamped when
 * strokes actually change, see Scorecards.ts) to skip unrelated saves like the tee-time
 * backfill, so this never runs on a save that didn't change anyone's score. It also doubles as
 * the "saveNonce" fed to every candidate below -- stable across retries of the exact same save,
 * different for any later one -- which is what makes evaluateAndPublish's fingerprint dedup
 * (publication-policy.ts) replay/retry-safe.
 *
 * Every Local API call below passes `req` so it reads/writes within the same in-flight
 * transaction as the Scorecard update that triggered this hook -- without it, a fresh
 * connection can't see this save's own not-yet-committed write, and leader/round-complete
 * detection ends up one hook invocation stale.
 *
 * Ace and eagle are classified from raw gross strokes vs par and tagged competition: "scratch" --
 * a hole-in-one or a gross eagle is a remarkable physical feat regardless of anyone's handicap,
 * the way real golf commentary always means it. Birdie/bogey and the streak/momentum categories
 * (moving-up, charge, moving-down, trouble, leader-falters), by contrast, are classified from
 * Main/Nett -- each player's handicap-adjusted score for that hole -- and tagged competition:
 * "main", since those are about whether a hole actually moved the Main leaderboard. A player who
 * makes a gross bogey but receives a stroke on that hole nets a birdie in Main terms, and that's
 * the story that matters for these categories (a gross-only view previously missed it entirely).
 *
 * Every candidate below is collected into `candidates` (via the local `publish` helper) rather
 * than published as it's detected. Once every source for this save has run -- the per-hole loop,
 * movement, pressure-moment, and the Race Tracker/winner-confirmed candidates built by
 * race-events.ts/winner-confirmed.ts -- the full set is run through findLowerPriorityCandidates
 * (publication-policy.ts) once, which keeps only the single highest-significance non-critical
 * candidate per player for this save (a birdie, the streak it just completed, and newly entering
 * contention no longer publish as three separate posts for the same moment). Only then does each
 * candidate go through evaluateAndPublish, the single gate that scores significance, applies the
 * cooldown/max-per-hour throttle, dedups via a unique fingerprint, validates the generated copy,
 * and writes an observability row to live-blog-trigger-log. A failure anywhere in that gate is
 * caught internally and never propagates here, so a live-blog problem can never roll back or
 * block the scorecard save.
 */
export const generateLiveBlogPosts: CollectionAfterChangeHook<Scorecard> = async ({ doc, previousDoc, req, operation, context }) => {
  if (operation !== "update") return doc;
  if (!doc.scoreUpdatedAt || doc.scoreUpdatedAt === previousDoc?.scoreUpdatedAt) return doc;

  // The Group Scoring bulk tool (src/app/(app)/api/admin-scoring/save/route.ts) flags its own
  // updates with this -- it saves many players/holes in rapid succession (e.g. backfilling an
  // old championship's results), which isn't real-time play and shouldn't be narrated as such.
  // A single edit through the normal Scorecards admin field is unaffected.
  if (context?.suppressLiveBlog) return doc;

  const playerId = typeof doc.player === "object" ? doc.player.id : doc.player;
  const championshipId = typeof doc.championship === "object" ? doc.championship.id : doc.championship;
  if (!playerId || !championshipId) return doc;

  const championship = (typeof doc.championship === "object"
    ? doc.championship
    : await req.payload.findByID({ collection: "championships", id: championshipId, req })) as Championship;

  // Only the championship flagged "Currently Being Scored" gets live commentary -- replaying an
  // old championship's results after the fact (historical backfill) should be silent, not
  // narrated as if it were happening live right now.
  if (!championship.isActive) return doc;

  const config = await getLiveBlogConfig(req);
  const saveNonce = doc.scoreUpdatedAt;
  const candidates: TriggerCandidate[] = [];
  const publish = (candidate: TriggerCandidate) => {
    candidates.push(candidate);
  };

  const player = (typeof doc.player === "object"
    ? doc.player
    : await req.payload.findByID({ collection: "players", id: playerId, req })) as Player;
  const venueId = typeof championship.venue === "object" ? championship.venue?.id : championship.venue;
  const venue = venueId ? ((await req.payload.findByID({ collection: "venues", id: venueId, req })) as Venue) : null;
  const venueHoles = venue?.holes ?? [];

  const justStarted = (previousDoc?.holesCompleted ?? 0) === 0 && (doc.holesCompleted ?? 0) > 0;

  if (justStarted) {
    const startedElsewhere = await req.payload.find({
      collection: "scorecards",
      where: {
        and: [
          { championship: { equals: championshipId } },
          { holesCompleted: { greater_than: 0 } },
          { id: { not_equals: doc.id } },
        ],
      },
      limit: 1,
      depth: 0,
      req,
    });
    if (startedElsewhere.docs.length === 0 && venue) {
      const { headline, body } = competitionUnderwayCommentary(championship.year, venue.name);
      await publish({
        category: "championship",
        championshipId: championshipId as string,
        saveNonce: `${saveNonce}:underway`,
        significance: { category: "championship", inContention: true },
        post: { category: "championship", headline, body, championship: championshipId as string },
      });
    }

    // Last group out: this player's first hole, and they belong to the latest tee-time group.
    const teeTimeRounds = await req.payload.find({
      collection: "tee-time-rounds",
      where: { and: [{ championship: { equals: championshipId } }, { round: { equals: "Championship" } }] },
      limit: 50,
      depth: 0,
      req,
    });
    let latestGroupTime = -Infinity;
    let latestGroupPlayerIds: (string | number)[] = [];
    for (const round of teeTimeRounds.docs) {
      for (const group of round.groups ?? []) {
        const minutes = parseTeeTimeMinutes(group.time);
        if (minutes > latestGroupTime) {
          latestGroupTime = minutes;
          latestGroupPlayerIds = (group.players ?? []).map((p) => (typeof p === "object" ? p.id : p));
        }
      }
    }
    const inLastGroup = latestGroupPlayerIds.some((id) => String(id) === String(playerId));
    if (inLastGroup && venue) {
      const alreadyPosted = await req.payload.find({
        collection: "live-blog-posts",
        where: { and: [{ championship: { equals: championshipId } }, { category: { equals: "last-group" } }] },
        limit: 1,
        depth: 0,
        req,
      });
      if (alreadyPosted.docs.length === 0) {
        const { headline, body } = lastGroupOutCommentary(venue.name);
        await publish({
          category: "last-group",
          championshipId: championshipId as string,
          saveNonce: `${saveNonce}:last-group`,
          significance: { category: "last-group", inContention: true },
          post: { category: "last-group", headline, body, championship: championshipId as string },
        });
      }
    }
  }

  const newHoles = doc.holes ?? [];
  const oldHoles = previousDoc?.holes ?? [];

  // The Race Tracker's before/after snapshot pair also covers what used to be a separate
  // getCompetitionLeaderboard("main", req) call here -- `snapshots.after.main` is the same data.
  const snapshots = previousDoc ? await getLeaderboardSnapshotPair(req, doc.id, previousDoc) : undefined;
  const mainEntries = snapshots?.after.main ?? (await getCompetitionLeaderboard("main", req));
  const mainEntry = mainEntries.find((e) => String(e.player.id) === String(playerId));
  // Margin-based, not position-based: the four per-hole Main categories (nett eagle-or-better,
  // birdie, bogey, double-bogey) always show for the leader or anyone within STRIKING_DISTANCE
  // shots of them, regardless of raw position -- a player 3 back in 9th is still part of the
  // story; someone 8 back in 4th (a thin, bunched field) is not.
  const startedMainEntries = mainEntries.filter((e) => e.started && !e.noReturn);
  const leaderToPar = startedMainEntries.length > 0 ? Math.min(...startedMainEntries.map((e) => e.toPar ?? Infinity)) : undefined;
  const marginToLeader = mainEntry?.toPar !== undefined && leaderToPar !== undefined ? mainEntry.toPar - leaderToPar : undefined;
  const inStrikingDistance = marginToLeader !== undefined && marginToLeader <= STRIKING_DISTANCE;
  const isSoleLeader = mainEntry?.position === 1 && !mainEntry?.tied;

  // Birdie/bogey and the streak categories below are classified from Main/Nett -- mainEntry's own
  // holes[] already carries each hole's handicap-adjusted relative-to-par (see
  // buildLeaderboardFromDocs in scorecards.ts) -- undefined for a hole not yet played, matching
  // what trailingStreak/birdiesInWindow need to correctly stop a streak at the edge of play.
  const nettRelatives = (mainEntry?.holes ?? []).map((h) => (h.value !== undefined ? h.relative : undefined));

  // Ace/eagle stay gross-classified and tagged Scratch -- see the note above the hook.
  const scratchEntries = snapshots?.after.scratch ?? (await getCompetitionLeaderboard("scratch", req));
  const scratchEntry = scratchEntries.find((e) => String(e.player.id) === String(playerId));

  let worstRelativeThisSave: number | undefined;
  let worstHoleThisSave: number | undefined;
  let bestRelativeThisSave: number | undefined;
  let bestHoleThisSave: number | undefined;

  // A no-return on any hole disqualifies the whole card for Main/Scratch (Stableford keeps
  // accumulating -- see computeScorecardTotals). Announce the moment it happens, once, then stop
  // narrating this player's Main/Scratch progress for the rest of the round -- their Stableford
  // story (via the Race Tracker below, which is never disqualified) carries on as normal.
  const playerNoReturn = Boolean(doc.noReturn);
  const wasNoReturn = Boolean(previousDoc?.noReturn);
  let noReturnAnnouncedThisSave = false;

  for (let i = 0; i < newHoles.length; i++) {
    const holeNumber = i + 1;
    const newHoleNoReturn = Boolean(newHoles[i]?.noReturn);
    const oldHoleNoReturn = Boolean(oldHoles[i]?.noReturn);

    if (newHoleNoReturn && !oldHoleNoReturn && !wasNoReturn && !noReturnAnnouncedThisSave) {
      noReturnAnnouncedThisSave = true;
      const { headline, body } = noReturnCommentary(player.name, holeNumber);
      await publish({
        category: "no-return",
        championshipId: championshipId as string,
        playerId: playerId as string,
        playerName: player.name,
        holeNumber,
        saveNonce: `${saveNonce}:hole-${holeNumber}:no-return`,
        significance: { category: "no-return", inContention: true, holesRemaining: 18 - holeNumber },
        post: {
          category: "no-return",
          headline,
          body,
          championship: championshipId as string,
          player: playerId as string,
          holeNumber,
        },
      });
    }

    if (playerNoReturn) continue;

    const newStrokes = newHoles[i]?.strokes;
    const oldStrokes = oldHoles[i]?.strokes;
    if (newStrokes == null || newStrokes === oldStrokes) continue;

    const par = venueHoles[i]?.par ?? 4;
    const grossRelative = newStrokes - par;
    const nettRelative = nettRelatives[i];
    const holesRemaining = 18 - holeNumber;
    const holeNonce = `${saveNonce}:hole-${holeNumber}`;

    if (nettRelative !== undefined && nettRelative >= 1 && (worstRelativeThisSave === undefined || nettRelative > worstRelativeThisSave)) {
      worstRelativeThisSave = nettRelative;
      worstHoleThisSave = holeNumber;
    }
    if (nettRelative !== undefined && nettRelative <= -1 && (bestRelativeThisSave === undefined || nettRelative < bestRelativeThisSave)) {
      bestRelativeThisSave = nettRelative;
      bestHoleThisSave = holeNumber;
    }

    if (newStrokes === 1) {
      const { headline, body } = aceCommentary(player.name, holeNumber);
      await publish({
        category: "ace",
        championshipId: championshipId as string,
        playerId: playerId as string,
        playerName: player.name,
        holeNumber,
        saveNonce: holeNonce,
        significance: { category: "ace", inContention: true, holesRemaining },
        post: {
          category: "ace",
          headline,
          body,
          championship: championshipId as string,
          player: playerId as string,
          holeNumber,
          scoreRelative: scratchEntry?.toPar ?? undefined,
          competition: "scratch",
        },
      });
    } else if (grossRelative <= -3) {
      const { headline, body } = albatrossCommentary(player.name, holeNumber);
      await publish({
        category: "albatross",
        championshipId: championshipId as string,
        playerId: playerId as string,
        playerName: player.name,
        holeNumber,
        saveNonce: holeNonce,
        significance: { category: "albatross", inContention: true, holesRemaining },
        post: {
          category: "albatross",
          headline,
          body,
          championship: championshipId as string,
          player: playerId as string,
          holeNumber,
          scoreRelative: scratchEntry?.toPar ?? undefined,
          competition: "scratch",
        },
      });
    } else if (grossRelative === -2) {
      const { headline, body } = eagleCommentary(player.name, holeNumber);
      await publish({
        category: "eagle",
        championshipId: championshipId as string,
        playerId: playerId as string,
        playerName: player.name,
        holeNumber,
        saveNonce: holeNonce,
        significance: { category: "eagle", inContention: true, holesRemaining },
        post: {
          category: "eagle",
          headline,
          body,
          championship: championshipId as string,
          player: playerId as string,
          holeNumber,
          scoreRelative: scratchEntry?.toPar ?? undefined,
          competition: "scratch",
        },
      });
    } else if (nettRelative !== undefined && nettRelative <= -2 && inStrikingDistance) {
      const { headline, body } = nettEagleCommentary(player.name, holeNumber);
      await publish({
        category: "nett-eagle",
        championshipId: championshipId as string,
        playerId: playerId as string,
        playerName: player.name,
        holeNumber,
        saveNonce: holeNonce,
        significance: { category: "nett-eagle", inContention: true, holesRemaining },
        criticalOverride: true,
        post: {
          category: "nett-eagle",
          headline,
          body,
          championship: championshipId as string,
          player: playerId as string,
          holeNumber,
          scoreRelative: mainEntry?.toPar ?? undefined,
          competition: "main",
        },
      });
    } else if (nettRelative !== undefined && nettRelative === -1 && inStrikingDistance) {
      const { headline, body } = birdieCommentary(player.name, holeNumber);
      await publish({
        category: "birdie",
        championshipId: championshipId as string,
        playerId: playerId as string,
        playerName: player.name,
        holeNumber,
        saveNonce: holeNonce,
        significance: { category: "birdie", inContention: true, holesRemaining },
        criticalOverride: true,
        post: {
          category: "birdie",
          headline,
          body,
          championship: championshipId as string,
          player: playerId as string,
          holeNumber,
          scoreRelative: mainEntry?.toPar ?? undefined,
          competition: "main",
        },
      });
    } else if (nettRelative !== undefined && nettRelative === 1 && inStrikingDistance) {
      const { headline, body } = bogeyCommentary(player.name, holeNumber);
      await publish({
        category: "bogey",
        championshipId: championshipId as string,
        playerId: playerId as string,
        playerName: player.name,
        holeNumber,
        saveNonce: holeNonce,
        significance: { category: "bogey", inContention: true, holesRemaining },
        criticalOverride: true,
        post: {
          category: "bogey",
          headline,
          body,
          championship: championshipId as string,
          player: playerId as string,
          holeNumber,
          scoreRelative: mainEntry?.toPar ?? undefined,
          competition: "main",
        },
      });
    } else if (nettRelative !== undefined && nettRelative >= 2 && inStrikingDistance) {
      const { headline, body } = doubleBogeyCommentary(player.name, holeNumber, nettRelative);
      await publish({
        category: "double-bogey",
        championshipId: championshipId as string,
        playerId: playerId as string,
        playerName: player.name,
        holeNumber,
        saveNonce: holeNonce,
        significance: { category: "double-bogey", inContention: true, holesRemaining },
        criticalOverride: true,
        post: {
          category: "double-bogey",
          headline,
          body,
          championship: championshipId as string,
          player: playerId as string,
          holeNumber,
          scoreRelative: mainEntry?.toPar ?? undefined,
          competition: "main",
        },
      });
    }

    if (nettRelative !== undefined) {
      const inUpwardMomentumRange = marginToLeader !== undefined && marginToLeader <= momentumMargin(holeNumber);
      if (nettRelative <= -1 && inUpwardMomentumRange) {
        const streak = trailingStreak(nettRelatives, i, "under");
        if (streak === 2) {
          const { headline, body } = movingUpCommentary(player.name);
          await publish({
            category: "moving-up",
            championshipId: championshipId as string,
            playerId: playerId as string,
            playerName: player.name,
            holeNumber,
            saveNonce: `${holeNonce}:streak`,
            significance: { category: "moving-up", inContention: true, holesRemaining },
            post: {
              category: "moving-up",
              headline,
              body,
              championship: championshipId as string,
              player: playerId as string,
              holeNumber,
              scoreRelative: mainEntry?.toPar ?? undefined,
              competition: "main",
            },
          });
        } else if (streak === 3) {
          const { headline, body } = chargeCommentary(player.name, streak);
          await publish({
            category: "charge",
            championshipId: championshipId as string,
            playerId: playerId as string,
            playerName: player.name,
            holeNumber,
            saveNonce: `${holeNonce}:streak`,
            significance: { category: "charge", inContention: true, holesRemaining },
            post: {
              category: "charge",
              headline,
              body,
              championship: championshipId as string,
              player: playerId as string,
              holeNumber,
              scoreRelative: mainEntry?.toPar ?? undefined,
              competition: "main",
            },
          });
        } else if (streak === HOT_STREAK_LENGTH) {
          // Fires once, the hole the streak first extends past "charge" -- an even longer run
          // (5, 6...) is so rare in practice that a second escalation tier isn't worth the
          // complexity; the story has already been told as emphatically as it needs to be.
          const { headline, body } = hotStreakCommentary(player.name, streak);
          await publish({
            category: "hot-streak",
            championshipId: championshipId as string,
            playerId: playerId as string,
            playerName: player.name,
            holeNumber,
            saveNonce: `${holeNonce}:streak`,
            significance: { category: "hot-streak", inContention: true, holesRemaining },
            post: {
              category: "hot-streak",
              headline,
              body,
              championship: championshipId as string,
              player: playerId as string,
              holeNumber,
              scoreRelative: mainEntry?.toPar ?? undefined,
              competition: "main",
            },
          });
        }

        // Looser "3 birdies in the last 4 holes" pattern -- distinct from the strict 3-in-a-row
        // streak above (which already covers the stronger version of this same narrative beat,
        // so skip here when streak is exactly 3 to avoid a duplicate "charge" post for one hole).
        if (streak !== 3) {
          const windowCount = birdiesInWindow(nettRelatives, i, 4);
          const previousWindowCount = birdiesInWindow(nettRelatives, i - 1, 4);
          if (windowCount >= 3 && previousWindowCount < 3) {
            const { headline, body } = birdieRunCommentary(player.name, windowCount, 4);
            await publish({
              category: "charge",
              championshipId: championshipId as string,
              playerId: playerId as string,
              playerName: player.name,
              holeNumber,
              saveNonce: `${holeNonce}:run`,
              significance: { category: "charge", inContention: true, holesRemaining },
              post: {
                category: "charge",
                headline,
                body,
                championship: championshipId as string,
                player: playerId as string,
                holeNumber,
                scoreRelative: mainEntry?.toPar ?? undefined,
                competition: "main",
              },
            });
          }
        }
      } else if (nettRelative >= 1) {
        const streak = trailingStreak(nettRelatives, i, "over");
        const isChallenger = !isSoleLeader && inStrikingDistance;
        // The leader or a genuine challenger wobbling in the closing holes is a bigger, more
        // specific story than a generic "moving down" for anyone else -- takes priority so the
        // same streak doesn't also post as ordinary moving-down/trouble. Leader wins if somehow
        // both conditions were true (they can't be simultaneously -- isSoleLeader and isChallenger
        // are mutually exclusive by construction -- but the ordering documents the intent).
        if (streak >= FALTERS_MIN_STREAK && isSoleLeader && holeNumber >= FALTERS_FROM_HOLE) {
          const { headline, body } = leaderFaltersCommentary(player.name, streak);
          await publish({
            category: "leader-falters",
            championshipId: championshipId as string,
            playerId: playerId as string,
            playerName: player.name,
            holeNumber,
            saveNonce: `${holeNonce}:leader-falters`,
            significance: { category: "leader-falters", inContention: true, holesRemaining },
            post: {
              category: "leader-falters",
              headline,
              body,
              championship: championshipId as string,
              player: playerId as string,
              holeNumber,
              scoreRelative: mainEntry?.toPar ?? undefined,
              competition: "main",
            },
          });
        } else if (streak >= FALTERS_MIN_STREAK && isChallenger && holeNumber >= FALTERS_FROM_HOLE) {
          const { headline, body } = challengeFaltersCommentary(player.name, streak);
          await publish({
            category: "challenge-falters",
            championshipId: championshipId as string,
            playerId: playerId as string,
            playerName: player.name,
            holeNumber,
            saveNonce: `${holeNonce}:challenge-falters`,
            significance: { category: "challenge-falters", inContention: true, holesRemaining },
            post: {
              category: "challenge-falters",
              headline,
              body,
              championship: championshipId as string,
              player: playerId as string,
              holeNumber,
              scoreRelative: mainEntry?.toPar ?? undefined,
              competition: "main",
            },
          });
        } else if (holeNumber <= DOWNWARD_MOMENTUM_LAST_HOLE && marginToLeader !== undefined && marginToLeader <= DOWNWARD_MOMENTUM_MARGIN) {
          if (streak === 2) {
            const { headline, body } = movingDownCommentary(player.name);
            await publish({
              category: "moving-down",
              championshipId: championshipId as string,
              playerId: playerId as string,
              playerName: player.name,
              holeNumber,
              saveNonce: `${holeNonce}:streak`,
              significance: { category: "moving-down", inContention: true, holesRemaining },
              post: {
                category: "moving-down",
                headline,
                body,
                championship: championshipId as string,
                player: playerId as string,
                holeNumber,
                scoreRelative: mainEntry?.toPar ?? undefined,
                competition: "main",
              },
            });
          } else if (streak === 3) {
            const { headline, body } = troubleCommentary(player.name, streak);
            await publish({
              category: "trouble",
              championshipId: championshipId as string,
              playerId: playerId as string,
              playerName: player.name,
              holeNumber,
              saveNonce: `${holeNonce}:streak`,
              significance: { category: "trouble", inContention: true, holesRemaining },
              post: {
                category: "trouble",
                headline,
                body,
                championship: championshipId as string,
                player: playerId as string,
                holeNumber,
                scoreRelative: mainEntry?.toPar ?? undefined,
                competition: "main",
              },
            });
          }
        }
      }
    }
  }

  const finishedNow = (doc.holesCompleted ?? 0) >= 18;
  const finishedBefore = (previousDoc?.holesCompleted ?? 0) >= 18;
  if (finishedNow && !finishedBefore && mainEntry && !mainEntry.noReturn) {
    const { headline, body } = roundCompleteCommentary(player.name, mainEntry.toPar ?? 0, mainEntry.position, mainEntry.tied);
    await publish({
      category: "round-complete",
      championshipId: championshipId as string,
      playerId: playerId as string,
      playerName: player.name,
      saveNonce: `${saveNonce}:round-complete`,
      significance: { category: "round-complete", inContention: true, finishPosition: mainEntry.position },
      post: {
        category: "round-complete",
        headline,
        body,
        championship: championshipId as string,
        player: playerId as string,
        scoreRelative: mainEntry.toPar ?? undefined,
        competition: "main",
      },
    });

    const finishedEntries = mainEntries.filter((e) => e.score !== undefined);
    const bestFinished = finishedEntries.slice().sort((a, b) => (a.toPar ?? 0) - (b.toPar ?? 0))[0];
    if (bestFinished && String(bestFinished.player.id) === String(playerId)) {
      const latestClubhouseLeaderPosts = await req.payload.find({
        collection: "live-blog-posts",
        where: { and: [{ championship: { equals: championshipId } }, { category: { equals: "clubhouse-leader" } }] },
        sort: "-postedAt",
        limit: 1,
        depth: 0,
        req,
      });
      const lastPost = latestClubhouseLeaderPosts.docs[0];
      const lastClubhouseLeaderId = lastPost ? (typeof lastPost.player === "object" ? lastPost.player?.id : lastPost.player) : undefined;
      if (String(lastClubhouseLeaderId) !== String(playerId)) {
        const { headline: chHeadline, body: chBody } = clubhouseLeaderCommentary(player.name, bestFinished.toPar ?? 0);
        await publish({
          category: "clubhouse-leader",
          championshipId: championshipId as string,
          playerId: playerId as string,
          playerName: player.name,
          saveNonce: `${saveNonce}:clubhouse-leader`,
          significance: { category: "clubhouse-leader", inContention: true },
          post: {
            category: "clubhouse-leader",
            headline: chHeadline,
            body: chBody,
            championship: championshipId as string,
            player: playerId as string,
            scoreRelative: bestFinished.toPar ?? undefined,
            competition: "main",
          },
        });
      }
    }

    // Mirrors the clubhouse-leader check above, but for gross/Scratch rather than nett/Main --
    // the tournament's best gross round so far, live. Same dedup pattern: only posts again once a
    // different player actually takes over the spot.
    const finishedScratchEntries = scratchEntries.filter((e) => e.score !== undefined);
    const bestGrossFinished = finishedScratchEntries.slice().sort((a, b) => (a.toPar ?? 0) - (b.toPar ?? 0))[0];
    if (scratchEntry && !scratchEntry.noReturn && bestGrossFinished && String(bestGrossFinished.player.id) === String(playerId)) {
      const latestBestGrossPosts = await req.payload.find({
        collection: "live-blog-posts",
        where: { and: [{ championship: { equals: championshipId } }, { category: { equals: "best-gross-round" } }] },
        sort: "-postedAt",
        limit: 1,
        depth: 0,
        req,
      });
      const lastPost = latestBestGrossPosts.docs[0];
      const lastBestGrossId = lastPost ? (typeof lastPost.player === "object" ? lastPost.player?.id : lastPost.player) : undefined;
      if (String(lastBestGrossId) !== String(playerId)) {
        const { headline: bgHeadline, body: bgBody } = bestGrossRoundCommentary(player.name, bestGrossFinished.toPar ?? 0);
        await publish({
          category: "best-gross-round",
          championshipId: championshipId as string,
          playerId: playerId as string,
          playerName: player.name,
          saveNonce: `${saveNonce}:best-gross-round`,
          significance: { category: "best-gross-round", inContention: true },
          post: {
            category: "best-gross-round",
            headline: bgHeadline,
            body: bgBody,
            championship: championshipId as string,
            player: playerId as string,
            scoreRelative: bestGrossFinished.toPar ?? undefined,
            competition: "scratch",
          },
        });
      }
    }
  }

  const progressed = (doc.holesCompleted ?? 0) > (previousDoc?.holesCompleted ?? 0);
  // Fires on every hole from 10 onward, not just once -- keeps the leader(s)/close contenders
  // visible on an otherwise "quiet" par, since birdie/eagle/bogey/double-bogey already get their
  // own, more specific post for any other result. Not a one-time checkpoint: this is meant to be
  // an ongoing "still safely through" thread alongside those, from hole 10 to the finish.
  const pastThroughStart = (doc.holesCompleted ?? 0) >= THROUGH_START_HOLE;
  const scoredParThisHole = nettRelatives[(doc.holesCompleted ?? 1) - 1] === 0;
  const inThroughRange = mainEntry?.position === 1 || (marginToLeader !== undefined && marginToLeader <= WITHIN_TWO_SHOTS);
  if (progressed && pastThroughStart && scoredParThisHole && mainEntry && inThroughRange) {
    const { headline, body } = throughCommentary(player.name, doc.holesCompleted ?? 0, mainEntry.toPar ?? 0, marginToLeader ?? 0, mainEntry.tied);
    await publish({
      category: "through",
      championshipId: championshipId as string,
      playerId: playerId as string,
      playerName: player.name,
      saveNonce: `${saveNonce}:through`,
      significance: { category: "through", inContention: true, holesRemaining: 18 - (doc.holesCompleted ?? 0) },
      post: {
        category: "through",
        headline,
        body,
        championship: championshipId as string,
        player: playerId as string,
        scoreRelative: mainEntry.toPar ?? undefined,
        competition: "main",
      },
    });
  }

  if (snapshots) {
    // Significant Main leaderboard movement for this player: into the top 5/10, or a 5+ position
    // swing either way. `worstRelativeThisSave`/`bestRelativeThisSave` (tracked in the per-hole
    // loop above) name the actual hole result behind the move when there is one, matching "a
    // costly double bogey at the 12th drops ... from second to eighth" -- both are read directly
    // off this save's own hole data, never invented.
    // A no-return causes a real Main position collapse, but it's already covered by its own
    // announcement above -- not a "costly double bogey" story, so skip movement detection for it.
    const movement = mainEntry?.noReturn ? undefined : diffPositionMovement(snapshots.before.main, snapshots.after.main, playerId as string);
    if (movement) {
      const gainLabel = bestRelativeThisSave !== undefined ? birdieGainLabel(bestRelativeThisSave) : undefined;
      if (movement.kind === "enter-top-5" || movement.kind === "enter-top-10") {
        const { headline, body } = enterTopCommentary(player.name, movement.kind === "enter-top-5" ? 5 : 10, movement.position, gainLabel, bestHoleThisSave);
        await publish({
          category: "moving-up",
          championshipId: championshipId as string,
          playerId: playerId as string,
          playerName: player.name,
          saveNonce: `${saveNonce}:movement`,
          significance: { category: "moving-up", inContention: true, movementKind: movement.kind, positionsChanged: movement.positionsChanged },
          post: {
            category: "moving-up",
            headline,
            body,
            championship: championshipId as string,
            player: playerId as string,
            scoreRelative: mainEntry?.toPar ?? undefined,
            competition: "main",
          },
        });
      } else if (movement.kind === "big-gain") {
        const { headline, body } = bigGainCommentary(player.name, movement.positionsChanged, movement.position, gainLabel, bestHoleThisSave);
        await publish({
          category: "moving-up",
          championshipId: championshipId as string,
          playerId: playerId as string,
          playerName: player.name,
          saveNonce: `${saveNonce}:movement`,
          significance: { category: "moving-up", inContention: true, movementKind: "big-gain", positionsChanged: movement.positionsChanged },
          post: {
            category: "moving-up",
            headline,
            body,
            championship: championshipId as string,
            player: playerId as string,
            scoreRelative: mainEntry?.toPar ?? undefined,
            competition: "main",
          },
        });
      } else if (movement.kind === "big-drop") {
        const missLabel = worstRelativeThisSave !== undefined ? bogeyMissLabel(worstRelativeThisSave) : undefined;
        const { headline, body } = bigDropCommentary(player.name, movement.beforePosition, movement.position, missLabel, worstHoleThisSave);
        await publish({
          category: "moving-down",
          championshipId: championshipId as string,
          playerId: playerId as string,
          playerName: player.name,
          saveNonce: `${saveNonce}:movement`,
          significance: { category: "moving-down", inContention: true, movementKind: "big-drop", positionsChanged: movement.positionsChanged },
          post: {
            category: "moving-down",
            headline,
            body,
            championship: championshipId as string,
            player: playerId as string,
            scoreRelative: mainEntry?.toPar ?? undefined,
            competition: "main",
          },
        });
      }
    }

    // Closing-stretch pressure: leading or within 2 shots of the leader, reaching holes 16-18 --
    // now includes the leader themselves (previously excluded, since "through" covered them
    // separately; "through" is now just a single hole-10 checkpoint, so this is the leader's own
    // closing-stretch moment too). Fires once, on the save where they FIRST cross into the window
    // (not on every hole within it), so anyone in the exact right spot at 16, 17, or 18 gets one
    // post, never three.
    const enteringPressureWindow = (doc.holesCompleted ?? 0) >= PRESSURE_WINDOW_START && (previousDoc?.holesCompleted ?? 0) < PRESSURE_WINDOW_START;
    const inPressureMomentRange = mainEntry?.position === 1 || (marginToLeader !== undefined && marginToLeader <= WITHIN_TWO_SHOTS);
    if (progressed && enteringPressureWindow && mainEntry && inPressureMomentRange) {
      const { headline, body } = pressureMomentCommentary(player.name, marginToLeader ?? 0, "shot", "Main");
      await publish({
        category: "pressure-moment",
        championshipId: championshipId as string,
        playerId: playerId as string,
        playerName: player.name,
        holeNumber: doc.holesCompleted ?? 0,
        saveNonce: `${saveNonce}:pressure-moment`,
        significance: { category: "pressure-moment", inContention: true, holesRemaining: 18 - (doc.holesCompleted ?? 0) },
        post: {
          category: "pressure-moment",
          headline,
          body,
          championship: championshipId as string,
          player: playerId as string,
          holeNumber: doc.holesCompleted ?? 0,
          scoreRelative: mainEntry.toPar ?? undefined,
          competition: "main",
        },
      });
    }

    // Race Tracker: new leader / tie for the lead / lead extension / entering & leaving contention,
    // across all three competitions, from the before/after snapshot pair computed above.
    candidates.push(...(await buildRaceTrackerCandidates(req, championshipId as string, snapshots, saveNonce)));

    // Winner confirmed: fires at most once per competition, the moment the last player still out
    // on course finishes -- see winner-confirmed.ts for why this needs the before/after pair too.
    candidates.push(...(await buildWinnerConfirmedCandidates(req, championshipId as string, snapshots, saveNonce)));
  }

  // Every dedup check a candidate source above needs (last-group/clubhouse-leader "already
  // posted?", entering/leaving-contention's last-direction guard) reads real DB history from
  // before this save, not from other candidates collected during it -- so it's safe to gather
  // everything first and filter once, right before anything actually publishes.
  const lowerPriority = findLowerPriorityCandidates(candidates);
  for (const candidate of candidates) {
    await evaluateAndPublish(req, candidate, config, lowerPriority.has(candidate) ? "LOWER_PRIORITY" : undefined);
  }

  return doc;
};
