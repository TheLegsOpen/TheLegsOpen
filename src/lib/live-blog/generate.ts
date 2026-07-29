import type { CollectionAfterChangeHook, PayloadRequest } from "payload";

import { formatToPar } from "@/lib/leaderboard";
import { getCompetitionLeaderboard, parseTeeTimeMinutes, type Competition } from "@/lib/data/scorecards";
import {
  eagleCommentary,
  birdieCommentary,
  bogeyCommentary,
  leaderCommentary,
  roundCompleteCommentary,
  competitionUnderwayCommentary,
  lastGroupOutCommentary,
  movingUpCommentary,
  chargeCommentary,
  movingDownCommentary,
  troubleCommentary,
  leaderThroughCommentary,
  clubhouseLeaderCommentary,
} from "@/lib/live-blog/commentary";
import type { Scorecard, Player, Championship, Venue, LiveBlogPost } from "@/payload-types";

function createPost(req: PayloadRequest, data: Omit<LiveBlogPost, "id" | "postedAt" | "updatedAt" | "createdAt">) {
  return req.payload.create({ collection: "live-blog-posts", data: { ...data, postedAt: new Date().toISOString() }, req });
}

const COMPETITIONS: { key: Competition; label: string }[] = [
  { key: "main", label: "Main" },
  { key: "stableford", label: "Stableford" },
  { key: "scratch", label: "Scratch" },
];

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

/**
 * Fires whenever a Scorecard's holes are saved. Uses scoreUpdatedAt (only stamped when
 * strokes actually change, see Scorecards.ts) to skip unrelated saves like the tee-time
 * backfill, so this never runs on a save that didn't change anyone's score.
 *
 * Every Local API call below passes `req` so it reads/writes within the same in-flight
 * transaction as the Scorecard update that triggered this hook -- without it, a fresh
 * connection can't see this save's own not-yet-committed write, and leader/round-complete
 * detection ends up one hook invocation stale.
 *
 * Streaks, "top 10", leader-through-the-hole, and clubhouse leader are all based on the
 * Main competition only, matching how Round Complete already worked.
 */
export const generateLiveBlogPosts: CollectionAfterChangeHook<Scorecard> = async ({ doc, previousDoc, req, operation }) => {
  if (operation !== "update") return doc;
  if (!doc.scoreUpdatedAt || doc.scoreUpdatedAt === previousDoc?.scoreUpdatedAt) return doc;

  const playerId = typeof doc.player === "object" ? doc.player.id : doc.player;
  const championshipId = typeof doc.championship === "object" ? doc.championship.id : doc.championship;
  if (!playerId || !championshipId) return doc;

  const player = (typeof doc.player === "object"
    ? doc.player
    : await req.payload.findByID({ collection: "players", id: playerId, req })) as Player;
  const championship = (typeof doc.championship === "object"
    ? doc.championship
    : await req.payload.findByID({ collection: "championships", id: championshipId, req })) as Championship;
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
      await createPost(req, { category: "championship", headline, body, championship: championshipId as string });
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
        await createPost(req, { category: "last-group", headline, body, championship: championshipId as string });
      }
    }
  }

  const newHoles = doc.holes ?? [];
  const oldHoles = previousDoc?.holes ?? [];
  const relatives = newHoles.map((h, i) => (h?.strokes != null ? h.strokes - (venueHoles[i]?.par ?? 4) : undefined));

  const mainEntries = await getCompetitionLeaderboard("main", req);
  const mainEntry = mainEntries.find((e) => String(e.player.id) === String(playerId));
  const inTop10 = (mainEntry?.position ?? Infinity) <= TOP_10;

  for (let i = 0; i < newHoles.length; i++) {
    const newStrokes = newHoles[i]?.strokes;
    const oldStrokes = oldHoles[i]?.strokes;
    if (newStrokes == null || newStrokes === oldStrokes) continue;

    const par = venueHoles[i]?.par ?? 4;
    const relative = newStrokes - par;
    const holeNumber = i + 1;
    const scoreRelative = mainEntry?.toPar ?? undefined;

    if (relative <= -2) {
      const { headline, body } = eagleCommentary(player.name, holeNumber);
      await createPost(req, {
        category: "eagle",
        headline,
        body,
        championship: championshipId as string,
        player: playerId as string,
        holeNumber,
        scoreRelative,
      });
    } else if (relative === -1) {
      const { headline, body } = birdieCommentary(player.name, holeNumber);
      await createPost(req, {
        category: "birdie",
        headline,
        body,
        championship: championshipId as string,
        player: playerId as string,
        holeNumber,
        scoreRelative,
      });
    } else if (relative >= 1) {
      const { headline, body } = bogeyCommentary(player.name, holeNumber, relative);
      await createPost(req, {
        category: "bogey",
        headline,
        body,
        championship: championshipId as string,
        player: playerId as string,
        holeNumber,
        scoreRelative,
      });
    }

    if (inTop10) {
      if (relative <= -1) {
        const streak = trailingStreak(relatives, i, "under");
        if (streak === 2) {
          const { headline, body } = movingUpCommentary(player.name);
          await createPost(req, {
            category: "moving-up",
            headline,
            body,
            championship: championshipId as string,
            player: playerId as string,
            holeNumber,
            scoreRelative,
          });
        } else if (streak === 3) {
          const { headline, body } = chargeCommentary(player.name, streak);
          await createPost(req, {
            category: "charge",
            headline,
            body,
            championship: championshipId as string,
            player: playerId as string,
            holeNumber,
            scoreRelative,
          });
        }
      } else if (relative >= 1) {
        const streak = trailingStreak(relatives, i, "over");
        if (streak === 2) {
          const { headline, body } = movingDownCommentary(player.name);
          await createPost(req, {
            category: "moving-down",
            headline,
            body,
            championship: championshipId as string,
            player: playerId as string,
            holeNumber,
            scoreRelative,
          });
        } else if (streak === 3) {
          const { headline, body } = troubleCommentary(player.name, streak);
          await createPost(req, {
            category: "trouble",
            headline,
            body,
            championship: championshipId as string,
            player: playerId as string,
            holeNumber,
            scoreRelative,
          });
        }
      }
    }
  }

  const finishedNow = (doc.holesCompleted ?? 0) >= 18;
  const finishedBefore = (previousDoc?.holesCompleted ?? 0) >= 18;
  if (finishedNow && !finishedBefore && mainEntry) {
    const { headline, body } = roundCompleteCommentary(player.name, mainEntry.toPar ?? 0, mainEntry.position, mainEntry.tied);
    await createPost(req, {
      category: "round-complete",
      headline,
      body,
      championship: championshipId as string,
      player: playerId as string,
      scoreRelative: mainEntry.toPar ?? undefined,
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
        await createPost(req, {
          category: "clubhouse-leader",
          headline: chHeadline,
          body: chBody,
          championship: championshipId as string,
          player: playerId as string,
          scoreRelative: bestFinished.toPar ?? undefined,
        });
      }
    }
  }

  const progressed = (doc.holesCompleted ?? 0) > (previousDoc?.holesCompleted ?? 0);
  if (progressed && mainEntry && mainEntry.position === 1) {
    const { headline, body } = leaderThroughCommentary(player.name, doc.holesCompleted ?? 0, mainEntry.toPar ?? 0, mainEntry.tied);
    await createPost(req, {
      category: "through",
      headline,
      body,
      championship: championshipId as string,
      player: playerId as string,
      scoreRelative: mainEntry.toPar ?? undefined,
    });
  }

  for (const { key, label } of COMPETITIONS) {
    const entries = key === "main" ? mainEntries : await getCompetitionLeaderboard(key, req);
    const soleLeader = entries[0] && !entries[0].tied ? entries[0] : null;
    if (!soleLeader) continue;

    const latestLeaderPosts = await req.payload.find({
      collection: "live-blog-posts",
      where: { and: [{ championship: { equals: championshipId } }, { category: { equals: "leader" } }, { competition: { equals: key } }] },
      sort: "-postedAt",
      limit: 1,
      depth: 0,
      req,
    });
    const lastPost = latestLeaderPosts.docs[0];
    const lastLeaderPlayerId = lastPost ? (typeof lastPost.player === "object" ? lastPost.player?.id : lastPost.player) : undefined;
    if (String(lastLeaderPlayerId) === String(soleLeader.player.id)) continue;

    const scoreRaw = key === "stableford" ? (soleLeader.score ?? 0) : (soleLeader.toPar ?? 0);
    const scoreLabel = key === "stableford" ? `${scoreRaw} pts` : formatToPar(scoreRaw);
    const { headline, body } = leaderCommentary(soleLeader.player.name, scoreLabel, label);
    await createPost(req, {
      category: "leader",
      competition: key,
      headline,
      body,
      championship: championshipId as string,
      player: soleLeader.player.id,
      scoreRelative: scoreRaw,
    });
  }

  return doc;
};
