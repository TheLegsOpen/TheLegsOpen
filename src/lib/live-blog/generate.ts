import type { CollectionAfterChangeHook, PayloadRequest } from "payload";

import { getCompetitionLeaderboard, getLeaderboardSnapshotPair, parseTeeTimeMinutes } from "@/lib/data/scorecards";
import { getLiveBlogConfig } from "@/lib/data/live-blog";
import { evaluateAndPublish, type TriggerCandidate } from "@/lib/live-blog/publication-policy";
import { generateRaceTrackerPosts } from "@/lib/live-blog/race-events";
import { generateWinnerConfirmedPosts } from "@/lib/live-blog/winner-confirmed";
import { buildRaceTracker, diffPositionMovement } from "@/lib/live-blog/race-tracker";
import {
  aceCommentary,
  eagleCommentary,
  birdieCommentary,
  bogeyCommentary,
  bogeyMissLabel,
  roundCompleteCommentary,
  competitionUnderwayCommentary,
  lastGroupOutCommentary,
  movingUpCommentary,
  chargeCommentary,
  birdieRunCommentary,
  movingDownCommentary,
  troubleCommentary,
  enterTopCommentary,
  bigGainCommentary,
  bigDropCommentary,
  pressureMomentCommentary,
  leaderThroughCommentary,
  clubhouseLeaderCommentary,
} from "@/lib/live-blog/commentary";
import type { Scorecard, Player, Championship, Venue, LiveBlogPost } from "@/payload-types";

const TOP_10 = 10;

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
 * Ace/eagle/birdie/bogey and the streak/momentum categories (moving-up, charge, moving-down,
 * trouble) are classified from raw gross strokes vs par -- that's the Scratch competition's own
 * definition, not Main/Nett (which applies handicap strokes per hole) -- so they're tagged
 * competition: "scratch" and use the player's Scratch to-par, not their Main one. The "in top 10"
 * gate for them, leader-through-the-hole, round-complete and clubhouse-leader all still use the
 * Main leaderboard/position, and are tagged competition: "main" accordingly.
 *
 * Every candidate below is routed through evaluateAndPublish (publication-policy.ts) rather than
 * created directly -- that's the single gate that scores significance, applies the cooldown/
 * max-per-hour throttle, dedups via a unique fingerprint, validates the generated copy, and
 * writes an observability row to live-blog-trigger-log, all without changing the detection logic
 * itself. A failure anywhere in that gate is caught internally and never propagates here, so a
 * live-blog problem can never roll back or block the scorecard save.
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
  const publish = (candidate: TriggerCandidate) => evaluateAndPublish(req, candidate, config);

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
  const relatives = newHoles.map((h, i) => (h?.strokes != null ? h.strokes - (venueHoles[i]?.par ?? 4) : undefined));

  // The Race Tracker's before/after snapshot pair also covers what used to be a separate
  // getCompetitionLeaderboard("main", req) call here -- `snapshots.after.main` is the same data.
  const snapshots = previousDoc ? await getLeaderboardSnapshotPair(req, doc.id, previousDoc) : undefined;
  const mainEntries = snapshots?.after.main ?? (await getCompetitionLeaderboard("main", req));
  const mainEntry = mainEntries.find((e) => String(e.player.id) === String(playerId));
  const inTop10 = (mainEntry?.position ?? Infinity) <= TOP_10;

  // Ace/eagle/birdie/bogey and the streak categories below are all classified from raw gross
  // strokes vs par (see `relative` in the loop) -- that's literally the Scratch competition's own
  // definition, not Main/Nett (which applies each player's handicap strokes per hole). A "bogey"
  // here can be a Main par or better for a player who receives a stroke on that hole, so these
  // posts are tagged competition: "scratch" and show the player's Scratch (gross) to-par, not
  // their Main one -- otherwise the post reads as being about the Main leaderboard when it isn't.
  const scratchEntries = snapshots?.after.scratch ?? (await getCompetitionLeaderboard("scratch", req));
  const scratchEntry = scratchEntries.find((e) => String(e.player.id) === String(playerId));

  let worstRelativeThisSave: number | undefined;

  for (let i = 0; i < newHoles.length; i++) {
    const newStrokes = newHoles[i]?.strokes;
    const oldStrokes = oldHoles[i]?.strokes;
    if (newStrokes == null || newStrokes === oldStrokes) continue;

    const par = venueHoles[i]?.par ?? 4;
    const relative = newStrokes - par;
    const holeNumber = i + 1;
    // Gross-classified (ace/eagle/birdie/bogey/streaks) -- see the scratchEntry note above.
    const scoreRelative = scratchEntry?.toPar ?? undefined;
    const holesRemaining = 18 - holeNumber;
    const holeNonce = `${saveNonce}:hole-${holeNumber}`;

    if (relative >= 1 && (worstRelativeThisSave === undefined || relative > worstRelativeThisSave)) {
      worstRelativeThisSave = relative;
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
          scoreRelative,
          competition: "scratch",
        },
      });
    } else if (relative <= -2) {
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
          scoreRelative,
          competition: "scratch",
        },
      });
    } else if (relative === -1) {
      const { headline, body } = birdieCommentary(player.name, holeNumber);
      await publish({
        category: "birdie",
        championshipId: championshipId as string,
        playerId: playerId as string,
        playerName: player.name,
        holeNumber,
        saveNonce: holeNonce,
        significance: { category: "birdie", inContention: inTop10, holesRemaining },
        post: {
          category: "birdie",
          headline,
          body,
          championship: championshipId as string,
          player: playerId as string,
          holeNumber,
          scoreRelative,
          competition: "scratch",
        },
      });
    } else if (relative >= 1) {
      const { headline, body } = bogeyCommentary(player.name, holeNumber, relative);
      await publish({
        category: "bogey",
        championshipId: championshipId as string,
        playerId: playerId as string,
        playerName: player.name,
        holeNumber,
        saveNonce: holeNonce,
        significance: { category: "bogey", inContention: inTop10, holesRemaining },
        post: {
          category: "bogey",
          headline,
          body,
          championship: championshipId as string,
          player: playerId as string,
          holeNumber,
          scoreRelative,
          competition: "scratch",
        },
      });
    }

    if (inTop10) {
      if (relative <= -1) {
        const streak = trailingStreak(relatives, i, "under");
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
              scoreRelative,
              competition: "scratch",
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
              scoreRelative,
              competition: "scratch",
            },
          });
        }

        // Looser "3 birdies in the last 4 holes" pattern -- distinct from the strict 3-in-a-row
        // streak above (which already covers the stronger version of this same narrative beat,
        // so skip here when streak is exactly 3 to avoid a duplicate "charge" post for one hole).
        if (streak !== 3) {
          const windowCount = birdiesInWindow(relatives, i, 4);
          const previousWindowCount = birdiesInWindow(relatives, i - 1, 4);
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
                scoreRelative,
                competition: "scratch",
              },
            });
          }
        }
      } else if (relative >= 1) {
        const streak = trailingStreak(relatives, i, "over");
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
              scoreRelative,
              competition: "scratch",
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
              scoreRelative,
              competition: "scratch",
            },
          });
        }
      }
    }
  }

  const finishedNow = (doc.holesCompleted ?? 0) >= 18;
  const finishedBefore = (previousDoc?.holesCompleted ?? 0) >= 18;
  if (finishedNow && !finishedBefore && mainEntry) {
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
  }

  const progressed = (doc.holesCompleted ?? 0) > (previousDoc?.holesCompleted ?? 0);
  if (progressed && mainEntry && mainEntry.position === 1) {
    const { headline, body } = leaderThroughCommentary(player.name, doc.holesCompleted ?? 0, mainEntry.toPar ?? 0, mainEntry.tied);
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
    // swing either way. `worstRelativeThisSave` (tracked in the per-hole loop above) names the
    // mistake behind a fall when there is one, matching "a costly double bogey drops ... from
    // second to eighth."
    const movement = diffPositionMovement(snapshots.before.main, snapshots.after.main, playerId as string);
    if (movement) {
      if (movement.kind === "enter-top-5" || movement.kind === "enter-top-10") {
        const { headline, body } = enterTopCommentary(player.name, movement.kind === "enter-top-5" ? 5 : 10, movement.position);
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
        const { headline, body } = bigGainCommentary(player.name, movement.positionsChanged, movement.position);
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
        const { headline, body } = bigDropCommentary(player.name, movement.beforePosition, movement.position, missLabel);
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

    // Final-hole pressure: a Race Tracker member (genuinely in contention, but not the outright
    // leader -- leaderThroughCommentary above already covers the leader's own progress) reaching
    // the 18th tee.
    if (progressed && (doc.holesCompleted ?? 0) === 17 && mainEntry && mainEntry.position !== 1) {
      const mainAfterTracker = buildRaceTracker(snapshots.after.main, "main");
      const trackerMember = mainAfterTracker.members.find((m) => String(m.playerId) === String(playerId));
      if (trackerMember) {
        const { headline, body } = pressureMomentCommentary(player.name, trackerMember.margin, "shot", "Main");
        await publish({
          category: "pressure-moment",
          championshipId: championshipId as string,
          playerId: playerId as string,
          playerName: player.name,
          saveNonce: `${saveNonce}:pressure-moment`,
          significance: { category: "pressure-moment", inContention: true, holesRemaining: 1 },
          post: {
            category: "pressure-moment",
            headline,
            body,
            championship: championshipId as string,
            player: playerId as string,
            scoreRelative: mainEntry.toPar ?? undefined,
            competition: "main",
          },
        });
      }
    }

    // Race Tracker: new leader / tie for the lead / lead extension / entering & leaving contention,
    // across all three competitions, from the before/after snapshot pair computed above.
    await generateRaceTrackerPosts(req, championshipId as string, snapshots, saveNonce, config);

    // Winner confirmed: fires at most once per competition, the moment the last player still out
    // on course finishes -- see winner-confirmed.ts for why this needs the before/after pair too.
    await generateWinnerConfirmedPosts(req, championshipId as string, snapshots, saveNonce, config);
  }

  return doc;
};
