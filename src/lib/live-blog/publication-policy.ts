import type { PayloadRequest, Where } from "payload";

import { computeSignificance, isCriticalCategory, bypassesCooldown, citesHoleNumber, type SignificanceInput, type TriggerCategory } from "@/lib/live-blog/significance";
import type { LiveBlogPost } from "@/payload-types";

export type SuppressionReason = "DISABLED" | "LOW_SIGNIFICANCE" | "COOLDOWN" | "MAX_PER_HOUR" | "DUPLICATE" | "FACT_VALIDATION_FAILED" | "LOWER_PRIORITY";

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
  maxPostsPerHour: 16,
};

export function buildFingerprint(input: { championshipId: string; category: string; playerId?: string; holeNumber?: number; saveNonce: string }): string {
  return [input.championshipId, input.category, input.playerId ?? "field", input.holeNumber ?? "-", input.saveNonce].join(":");
}

/** Pure gating decision -- given the facts, would this candidate publish? Kept separate from evaluateAndPublish so it's unit-testable without a database. */
export function decidePublication(params: {
  enabled: boolean;
  significance: number;
  minimumSignificance: number;
  /** Categories that can genuinely recur many times a round (birdie/bogey) are cooldown-gated; every other category is a one-off state change and shouldn't be held back by a burst of near-simultaneous saves. See significance.ts's bypassesCooldown. */
  cooldownExempt: boolean;
  /** Only the small set of always-must-publish categories (lead change, tie, pressure moment, winner confirmed, ace) bypass the hourly cap -- see significance.ts's isCriticalCategory. */
  rateLimitExempt: boolean;
  inCooldown: boolean;
  rateLimited: boolean;
}): { allow: boolean; reason?: SuppressionReason } {
  if (!params.enabled) return { allow: false, reason: "DISABLED" };
  if (params.significance < params.minimumSignificance) return { allow: false, reason: "LOW_SIGNIFICANCE" };
  if (!params.cooldownExempt && params.inCooldown) return { allow: false, reason: "COOLDOWN" };
  if (!params.rateLimitExempt && params.rateLimited) return { allow: false, reason: "MAX_PER_HOUR" };
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
  /** Set by the caller (generate.ts) to treat this one candidate as critical -- bypassing cooldown,
   * the hourly cap, and the story-selection filter below -- regardless of its category's default.
   * Exists for categories that should "always show" only conditionally: a nett eagle/birdie/bogey/
   * double-bogey for the leader or a player within 3 shots of them should never be held back by
   * cooldown or story selection, but the same category for a player with no realistic path to a
   * result should still be spam-guarded as normal. */
  criticalOverride?: boolean;
}

/**
 * Within one scorecard-save-triggered hook run, a single player can accumulate several
 * legitimately-qualifying non-critical candidates at once on the SAME leaderboard -- a birdie, the
 * 2-hole streak it just completed, newly entering contention -- that all describe the same real
 * moment. Publishing every one reads as spam (see the "spell of three posts" feedback from the
 * 2013 replay). Grouping is scoped to (player, competition), not just player -- a player can
 * genuinely make two distinct pieces of news on the same hole on two different boards (the 2013
 * replay caught exactly this: David Clee both extended his Scratch lead AND was the outright Main
 * leader through 2 holes on the same save), and collapsing those into one would lose real,
 * unrelated information rather than trim redundant retellings of the same one. Candidates with no
 * competition set (a field-wide post, a merged multi-competition post, a no-return announcement)
 * are exempt for the same reason -- there's no single board to collide on. Critical categories
 * (leader, tie, pressure-moment, winner-confirmed, playoff, ace) are exempt and always publish
 * independently regardless. Pure and DB-free so it's directly unit-testable; the caller
 * (generate.ts) is expected to run this once over every candidate collected from every source for
 * one hook invocation, then publish survivors normally and force-suppress the rest via
 * evaluateAndPublish's forceSuppressReason.
 */
export function findLowerPriorityCandidates(candidates: TriggerCandidate[]): Set<TriggerCandidate> {
  const byPlayerAndCompetition = new Map<string, TriggerCandidate[]>();
  for (const candidate of candidates) {
    if (isCriticalCategory(candidate.category) || candidate.criticalOverride || !candidate.playerId || !candidate.post.competition) continue;
    const key = `${candidate.playerId}:${candidate.post.competition}`;
    const group = byPlayerAndCompetition.get(key) ?? [];
    group.push(candidate);
    byPlayerAndCompetition.set(key, group);
  }

  const lowerPriority = new Set<TriggerCandidate>();
  for (const group of byPlayerAndCompetition.values()) {
    if (group.length <= 1) continue;
    let best = group[0];
    let bestSignificance = computeSignificance(best.significance);
    for (const candidate of group.slice(1)) {
      const significance = computeSignificance(candidate.significance);
      if (significance > bestSignificance) {
        lowerPriority.add(best);
        best = candidate;
        bestSignificance = significance;
      } else {
        lowerPriority.add(candidate);
      }
    }
  }
  return lowerPriority;
}

/**
 * The cooldown lookup is scoped to this player's own last birdie/bogey (the only cooldown-gated
 * categories -- see bypassesCooldown) rather than the championship's most recent post of any
 * kind. Otherwise an unrelated player's leader/tie/contention post -- which fires constantly once
 * several groups are out on course at once -- resets the clock and silently blocks a completely
 * different player's own, genuinely fresh birdie or bogey. The rate limit stays championship-wide
 * by design -- that's a real overall throughput cap, not a per-player spam guard.
 */
async function loadCooldownAndRateLimitState(
  req: PayloadRequest,
  championshipId: string,
  playerId: string | undefined,
  now: Date,
): Promise<{ lastPublishedAt: Date | undefined; postsInLastHour: number }> {
  const cooldownWhere: Where = playerId
    ? { and: [{ championship: { equals: championshipId } }, { player: { equals: playerId } }, { category: { in: ["birdie", "bogey"] } }] }
    : { and: [{ championship: { equals: championshipId } }, { category: { in: ["birdie", "bogey"] } }] };

  const [latest, hourCount] = await Promise.all([
    req.payload.find({
      collection: "live-blog-posts",
      where: cooldownWhere,
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
  /** Set by the caller when findLowerPriorityCandidates has already decided this candidate loses out to a same-player, same-save candidate with higher significance -- still logged (with its real significance/threshold) for observability, just short-circuited before the cooldown/rate-limit/publish steps. */
  forceSuppressReason?: SuppressionReason,
): Promise<{ published: boolean; reason?: SuppressionReason | "ERROR" }> {
  try {
    const significance = computeSignificance(candidate.significance);
    const critical = candidate.criticalOverride === true || isCriticalCategory(candidate.category);
    const cooldownExempt = critical || bypassesCooldown(candidate.category);
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

    if (forceSuppressReason) {
      await req.payload
        .update({ collection: "live-blog-trigger-log", id: logId, data: { suppressionReason: forceSuppressReason }, req })
        .catch(() => undefined);
      return { published: false, reason: forceSuppressReason };
    }

    const now = new Date();
    const { lastPublishedAt, postsInLastHour } = await loadCooldownAndRateLimitState(req, candidate.championshipId, candidate.playerId, now);
    const decision = decidePublication({
      enabled: config.enabled,
      significance,
      minimumSignificance: config.minimumSignificance,
      cooldownExempt,
      rateLimitExempt: critical,
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
      holeNumber: citesHoleNumber(candidate.category) ? candidate.holeNumber : undefined,
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
