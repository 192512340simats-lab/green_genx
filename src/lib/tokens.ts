import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "crypto";

/**
 * Status-access token.
 * 24 random bytes (192 bits) -> 32 URL-safe characters. It is shown to the team
 * exactly once on the success page. Only its SHA-256 hash is stored, so even a
 * database leak cannot reveal working tokens. Because the token has high
 * entropy, a plain (unsalted) SHA-256 is appropriate here.
 */
export const STATUS_TOKEN_LENGTH = 32;

export function generateStatusToken(): string {
  return randomBytes(24).toString("base64url");
}

export function hashStatusToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Constant-time comparison of a presented token against a stored hash. */
export function verifyStatusToken(token: string, storedHash: string): boolean {
  const presented = Buffer.from(hashStatusToken(token), "hex");
  let stored: Buffer;
  try {
    stored = Buffer.from(storedHash, "hex");
  } catch {
    return false;
  }
  if (presented.length !== stored.length) return false;
  return timingSafeEqual(presented, stored);
}
