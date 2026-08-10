import type { PayloadRequest } from "payload";

import { computeSignificance, isCriticalCategory, type SignificanceInput, type TriggerCategory } from "@/lib/live-blog/significance";
import type { LiveBlogPost } from "@/payload-types";

export type SuppressionReason = "DISABLED" | "LOW_SIGNIFICANCE" | "COOLDOWN" | "MAX_PER_HOUR" | "DUPLICATE" | "FACT_VALIDATION_FAILED";

export interface PublicationConfig {
  enabled: boolean;
  minimumSignificance: number;
  cooldownSeconds: number;
  maxPostsPerHour: number;
}

/**
 * Matches today's actual (pre-existing) behaviour as closely as possible -- these are the
 * fallback values used if the "Live Blog Config" global hasn't been saved yet, and are
 * deliberately not a blind copy of a generic spec's defaults (a flat minimumSignificance of 60,
 * for instance, would silently stop every ordinary birdie/bogey post the site already relies on
 * -- see significance.ts's base table for how the two are calibrated together).
 */
export const DEFAULT_PUBLICATION_CONFIG: PublicationConfig = {
  enabled: true,
  minimumSignificance: 35,
  cooldownSeconds: 90,
  maxPostsPerHour: 8,
};

export function buildFingerprint(input: { championshipId: string; category: string; playerId?: string; holeNumber?: number; saveNonce: string }): string {
  return [input.championshipId, input.category, input.playerId ?? "field", input.holeNumber ?? "-", input.saveNonce].join(":");
}

/** Pure gating decision -- given the facts, would this candidate publish? Kept separate from evaluateAndPublish so it's unit-testable without a database. */
export function decidePublication(params: {
  enabled: boolean;
  significance: number;
  minimumSignificance: number;
  critical: boolean;
  inCooldown: boolean;
  rateLimited: boolean;
}): { allow: boolean; reason?: SuppressionReason } {
  if (!params.enabled) return { allow: false, reason: "DISABLED" };
  if (params.significance < params.minimumSignificance) return { allow: false, reason: "LOW_SIGNIFICANCE" };
  if (!params.critical && params.inCooldown) return { allow: false, reason: "COOLDOWN" };
  if (!params.critical && params.rateLimited) return { allow: false, reason: "MAX_PER_HOUR" };
  return { allow: true };
}

export function isInCooldown(lastPublishedAt: Date | undefined, now: Date, cooldownSeconds: number): boolean {
  if (!lastPublishedAt) return false;
  return (now.getTime() - lastPublishedAt.getTime()) / 1000 < cooldownSeconds;
}

export function isRateLimited(postsInLastHour: number, maxPostsPerHour: number): boolean {
  return postsInLastHour >= maxPostsPerHour;
}

/**
 * Deterministic defensive check that the generated copy actually mentions the facts it's
 * supposed to be about. Every headline/body in this codebase comes from hand-written templates
 * in commentary.ts (see the note there) rather than an LLM, so this isn't guarding against
 * invented facts so much as catching a future template bug before it reaches the public site.
 */
export function validateFacts(post: { headline: string; body: string; playerName?: string; holeNumber?: number }): { valid: boolean; reason?: string } {
  const text = `${post.headline} ${post.body}`;
  if (post.playerName && !text.includes(post.playerName)) {
    return { valid: false, reason: `Generated copy does not mention player "${post.playerName}"` };
  }
  if (post.holeNumber !== undefined && !text.includes(String(post.holeNumber))) {
    return { valid: false, reason: `Generated copy does not mention hole ${post.holeNumber}` };
  }
  return { valid: true };
}

export interface TriggerCandidate {
  category: TriggerCategory;
  championshipId: string;
  playerId?: string;
  playerName?: string;
  holeNumber?: number;
  /** Identifies the scorecard save that produced this candidate (its scoreUpdatedAt stamp) -- the fingerprint's replay/retry-safety depends on this being stable for retries of the exact same save and different for any later save. */
  saveNonce: string;
  significance: SignificanceInput;
  post: Omit<LiveBlogPost, "id" | "postedAt" | "updatedAt" | "createdAt">;
}

async function loadCooldownAndRateLimitState(
  req: PayloadRequest,
  championshipId: string,
  now: Date,
): Promise<{ lastPublishedAt: Date | undefined; postsInLastHour: number }> {
  const [latest, hourCount] = await Promise.all([
    req.payload.find({
      collection: "live-blog-posts",
      where: { championship: { equals: championshipId } },
      sort: "-postedAt",
      limit: 1,
      depth: 0,
      req,
    }),
    req.payload.count({
      collection: "live-blog-posts",
      where: {
        and: [{ championship: { equals: championshipId } }, { postedAt: { greater_than: new Date(now.getTime() - 60 * 60 * 1000).toISOString() } }],
      },
      req,
    }),
  ]);
  const lastPost = latest.docs[0];
  return { lastPublishedAt: lastPost ? new Date(lastPost.postedAt) : undefined, postsInLastHour: hourCount.totalDocs };
}

/**
 * The single gate every live-blog candidate must pass through before a post is actually
 * created. Wraps the whole decision (significance, cooldown, rate limit, dedup, fact
 * validation) plus an observability row in `live-blog-trigger-log` so a suppressed candidate is
 * still diagnosable later ("why didn't this post?"). Never throws -- a failure here must not
 * block or roll back the scorecard save that triggered it (see the try/catch and section on
 * failure handling in the request that introduced this module).
 */
export async function evaluateAndPublish(
  req: PayloadRequest,
  candidate: TriggerCandidate,
  config: PublicationConfig = DEFAULT_PUBLICATION_CONFIG,
): Promise<{ published: boolean; reason?: SuppressionReason | "ERROR" }> {
  try {
    const significance = computeSignificance(candidate.significance);
    const critical = isCriticalCategory(candidate.category);
    const fingerprint = buildFingerprint(candidate);

    let logId: string;
    try {
      const log = await req.payload.create({
        collection: "live-blog-trigger-log",
        data: {
          fingerprint,
          championship: candidate.championshipId,
          player: candidate.playerId,
          category: candidate.category,
          holeNumber: candidate.holeNumber,
          significance,
          threshold: config.minimumSignificance,
          selected: false,
          suppressed: true,
          evaluatedAt: new Date().toISOString(),
        },
        req,
      });
      logId = String(log.id);
    } catch {
      // Unique fingerprint violation: this exact candidate (same championship/category/player/
      // hole/triggering save) was already evaluated, published or not. Retry/replay-safe no-op.
      return { published: false, reason: "DUPLICATE" };
    }

    const now = new Date();
    const { lastPublishedAt, postsInLastHour } = await loadCooldownAndRateLimitState(req, candidate.championshipId, now);
    const decision = decidePublication({
      enabled: config.enabled,
      significance,
      minimumSignificance: config.minimumSignificance,
      critical,
      inCooldown: isInCooldown(lastPublishedAt, now, config.cooldownSeconds),
      rateLimited: isRateLimited(postsInLastHour, config.maxPostsPerHour),
    });
    if (!decision.allow) {
      await req.payload
        .update({ collection: "live-blog-trigger-log", id: logId, data: { suppressionReason: decision.reason }, req })
        .catch(() => undefined);
      return { published: false, reason: decision.reason };
    }

    const validation = validateFacts({
      headline: candidate.post.headline,
      body: candidate.post.body,
      playerName: candidate.playerName,
      holeNumber: candidate.holeNumber,
    });
    if (!validation.valid) {
      console.error(`[live-blog] fact validation failed for ${fingerprint}: ${validation.reason}`);
      await req.payload
        .update({ collection: "live-blog-trigger-log", id: logId, data: { suppressionReason: "FACT_VALIDATION_FAILED" }, req })
        .catch(() => undefined);
      return { published: false, reason: "FACT_VALIDATION_FAILED" };
    }

    const post = await req.payload.create({
      collection: "live-blog-posts",
      data: { ...candidate.post, postedAt: new Date().toISOString() },
      req,
    });
    await req.payload
      .update({ collection: "live-blog-trigger-log", id: logId, data: { selected: true, suppressed: false, post: post.id }, req })
      .catch(() => undefined);
    return { published: true };
  } catch (error) {
    console.error("[live-blog] evaluateAndPublish failed, leaderboard/scoring unaffected:", error);
    return { published: false, reason: "ERROR" };
  }
}
