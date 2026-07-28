import type { CollectionAfterChangeHook, Payload } from "payload";

import { getCompetitionLeaderboard } from "@/lib/data/scorecards";
import { eagleCommentary, birdieCommentary, bogeyCommentary, leaderCommentary, roundCompleteCommentary } from "@/lib/live-blog/commentary";
import type { Scorecard, Player, Championship, Venue, LiveBlogPost } from "@/payload-types";

function createPost(payload: Payload, data: Omit<LiveBlogPost, "id" | "postedAt" | "updatedAt" | "createdAt">) {
  return payload.create({ collection: "live-blog-posts", data: { ...data, postedAt: new Date().toISOString() } });
}

/**
 * Fires whenever a Scorecard's holes are saved. Uses scoreUpdatedAt (only stamped when
 * strokes actually change, see Scorecards.ts) to skip unrelated saves like the tee-time
 * backfill, so this never runs on a save that didn't change anyone's score.
 */
export const generateLiveBlogPosts: CollectionAfterChangeHook<Scorecard> = async ({ doc, previousDoc, req, operation }) => {
  if (operation !== "update") return doc;
  if (!doc.scoreUpdatedAt || doc.scoreUpdatedAt === previousDoc?.scoreUpdatedAt) return doc;

  const playerId = typeof doc.player === "object" ? doc.player.id : doc.player;
  const championshipId = typeof doc.championship === "object" ? doc.championship.id : doc.championship;
  if (!playerId || !championshipId) return doc;

  const player = (typeof doc.player === "object" ? doc.player : await req.payload.findByID({ collection: "players", id: playerId })) as Player;
  const championship = (typeof doc.championship === "object"
    ? doc.championship
    : await req.payload.findByID({ collection: "championships", id: championshipId })) as Championship;
  const venueId = typeof championship.venue === "object" ? championship.venue?.id : championship.venue;
  const venue = venueId ? ((await req.payload.findByID({ collection: "venues", id: venueId })) as Venue) : null;
  const venueHoles = venue?.holes ?? [];

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
      await createPost(req.payload, {
        category: "eagle",
        headline,
        body,
        championship: championshipId as string,
        player: playerId as string,
        holeNumber,
      });
    } else if (relative === -1) {
      const { headline, body } = birdieCommentary(player.name, holeNumber);
      await createPost(req.payload, {
        category: "birdie",
        headline,
        body,
        championship: championshipId as string,
        player: playerId as string,
        holeNumber,
      });
    } else if (relative >= 1) {
      const { headline, body } = bogeyCommentary(player.name, holeNumber, relative);
      await createPost(req.payload, {
        category: "bogey",
        headline,
        body,
        championship: championshipId as string,
        player: playerId as string,
        holeNumber,
      });
    }
  }

  const mainEntries = await getCompetitionLeaderboard("main");

  const finishedNow = (doc.holesCompleted ?? 0) >= 18;
  const finishedBefore = (previousDoc?.holesCompleted ?? 0) >= 18;
  if (finishedNow && !finishedBefore) {
    const entry = mainEntries.find((e) => String(e.player.id) === String(playerId));
    if (entry) {
      const { headline, body } = roundCompleteCommentary(player.name, entry.toPar ?? 0, entry.position, entry.tied);
      await createPost(req.payload, {
        category: "round-complete",
        headline,
        body,
        championship: championshipId as string,
        player: playerId as string,
      });
    }
  }

  const soleLeader = mainEntries[0] && !mainEntries[0].tied ? mainEntries[0] : null;
  if (soleLeader) {
    const latestLeaderPosts = await req.payload.find({
      collection: "live-blog-posts",
      where: { and: [{ championship: { equals: championshipId } }, { category: { equals: "leader" } }] },
      sort: "-postedAt",
      limit: 1,
      depth: 0,
    });
    const lastPost = latestLeaderPosts.docs[0];
    const lastLeaderPlayerId = lastPost ? (typeof lastPost.player === "object" ? lastPost.player?.id : lastPost.player) : undefined;
    if (String(lastLeaderPlayerId) !== String(soleLeader.player.id)) {
      const { headline, body } = leaderCommentary(soleLeader.player.name, soleLeader.toPar ?? 0, "Main");
      await createPost(req.payload, {
        category: "leader",
        headline,
        body,
        championship: championshipId as string,
        player: soleLeader.player.id,
      });
    }
  }

  return doc;
};
