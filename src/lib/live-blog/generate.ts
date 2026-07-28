import type { CollectionAfterChangeHook, PayloadRequest } from "payload";

import { formatToPar } from "@/lib/leaderboard";
import { getCompetitionLeaderboard, type Competition } from "@/lib/data/scorecards";
import {
  eagleCommentary,
  birdieCommentary,
  bogeyCommentary,
  leaderCommentary,
  roundCompleteCommentary,
  competitionUnderwayCommentary,
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

/**
 * Fires whenever a Scorecard's holes are saved. Uses scoreUpdatedAt (only stamped when
 * strokes actually change, see Scorecards.ts) to skip unrelated saves like the tee-time
 * backfill, so this never runs on a save that didn't change anyone's score.
 *
 * Every Local API call below passes `req` so it reads/writes within the same in-flight
 * transaction as the Scorecard update that triggered this hook -- without it, a fresh
 * connection can't see this save's own not-yet-committed write, and leader/round-complete
 * detection ends up one hook invocation stale.
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
  }

  const newHoles = doc.holes ?? [];
  const oldHoles = previousDoc?.holes ?? [];

  for (let i = 0; i < newHoles.length; i++) {
    const newStrokes = newHoles[i]?.strokes;
    const oldStrokes = oldHoles[i]?.strokes;
    if (newStrokes == null || newStrokes === oldStrokes) continue;

    const par = venueHoles[i]?.par ?? 4;
    const relative = newStrokes - par;
    const holeNumber = i + 1;

    if (relative <= -2) {
      const { headline, body } = eagleCommentary(player.name, holeNumber);
      await createPost(req, {
        category: "eagle",
        headline,
        body,
        championship: championshipId as string,
        player: playerId as string,
        holeNumber,
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
      });
    }
  }

  const mainEntries = await getCompetitionLeaderboard("main", req);

  const finishedNow = (doc.holesCompleted ?? 0) >= 18;
  const finishedBefore = (previousDoc?.holesCompleted ?? 0) >= 18;
  if (finishedNow && !finishedBefore) {
    const entry = mainEntries.find((e) => String(e.player.id) === String(playerId));
    if (entry) {
      const { headline, body } = roundCompleteCommentary(player.name, entry.toPar ?? 0, entry.position, entry.tied);
      await createPost(req, {
        category: "round-complete",
        headline,
        body,
        championship: championshipId as string,
        player: playerId as string,
      });
    }
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

    const scoreLabel = key === "stableford" ? `${soleLeader.score ?? 0} pts` : formatToPar(soleLeader.toPar ?? 0);
    const { headline, body } = leaderCommentary(soleLeader.player.name, scoreLabel, label);
    await createPost(req, {
      category: "leader",
      competition: key,
      headline,
      body,
      championship: championshipId as string,
      player: soleLeader.player.id,
    });
  }

  return doc;
};
