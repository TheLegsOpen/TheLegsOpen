import { SignJWT, jwtVerify, errors as joseErrors } from "jose";

/**
 * PIN-based scorer auth for the on-course scoring app -- deliberately separate from Payload's own
 * admin auth (email/password-shaped, not a fit for a 5-character group PIN). Pure functions, no
 * `payload`/`@/payload.config` import, so this is directly unit-testable under vitest (test files
 * can't import Payload's config -- see the Node 24 + @next/env issue noted elsewhere in this repo).
 */

// Excludes 0/O and 1/I -- easy to misread on a phone screen in bright sunlight.
const PIN_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const PIN_LENGTH = 5;

export function generatePin(): string {
  let pin = "";
  for (let i = 0; i < PIN_LENGTH; i++) {
    pin += PIN_ALPHABET[Math.floor(Math.random() * PIN_ALPHABET.length)];
  }
  return pin;
}

export interface ScoringSessionPayload {
  teeTimeRoundId: string;
  groupId: string;
  championshipId: string;
  pinVersion: number;
}

function getSecretKey(): Uint8Array {
  const secret = process.env.PAYLOAD_SECRET;
  if (!secret) throw new Error("PAYLOAD_SECRET is not set -- required to sign scoring sessions.");
  return new TextEncoder().encode(secret);
}

/** `expiresAt` is the caller's call (typically the round's date plus a same-day buffer) -- kept
 * out of this module so the date logic lives with the route that actually has the round doc. */
export async function issueScoringSession(payload: ScoringSessionPayload, expiresAt: Date): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(getSecretKey());
}

/** Returns null for a missing, malformed, tampered, or expired token -- callers should treat any
 * null the same way (redirect to login), not distinguish the reason. */
export async function verifyScoringSession(token: string | undefined | null): Promise<ScoringSessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (
      typeof payload.teeTimeRoundId !== "string" ||
      typeof payload.groupId !== "string" ||
      typeof payload.championshipId !== "string" ||
      typeof payload.pinVersion !== "number"
    ) {
      return null;
    }
    return {
      teeTimeRoundId: payload.teeTimeRoundId,
      groupId: payload.groupId,
      championshipId: payload.championshipId,
      pinVersion: payload.pinVersion,
    };
  } catch (err) {
    if (err instanceof joseErrors.JWTExpired || err instanceof joseErrors.JWSSignatureVerificationFailed || err instanceof joseErrors.JWSInvalid) {
      return null;
    }
    return null;
  }
}

export const SCORING_SESSION_COOKIE = "scorer_session";
