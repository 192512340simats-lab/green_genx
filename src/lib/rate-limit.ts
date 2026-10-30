import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { getClientIp, hashForKey } from "@/lib/http";

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export interface RateLimitRule {
  /** Attempts allowed inside the window. */
  max: number;
  windowSeconds: number;
  /** How long the caller is blocked after exceeding `max`. */
  blockSeconds: number;
}

/** Central place to tune limits. */
export const LIMITS = {
  adminLoginPerIp: { max: 10, windowSeconds: 15 * 60, blockSeconds: 15 * 60 },
  adminLoginPerEmail: { max: 8, windowSeconds: 15 * 60, blockSeconds: 15 * 60 },
  registerPerIp: { max: 6, windowSeconds: 60 * 60, blockSeconds: 30 * 60 },
  statusLookupPerIp: { max: 20, windowSeconds: 10 * 60, blockSeconds: 15 * 60 },
  gatePassPerIp: { max: 30, windowSeconds: 10 * 60, blockSeconds: 10 * 60 },
  verifyPerIp: { max: 60, windowSeconds: 10 * 60, blockSeconds: 10 * 60 },
} satisfies Record<string, RateLimitRule>;

/**
 * Counts one attempt against `scope:identifier` using the atomic SQL function
 * public.rate_limit_hit (see migration 0002). Fails CLOSED: if the database
 * call errors, the request is denied rather than silently unprotected.
 */
export async function rateLimit(
  scope: string,
  identifier: string,
  rule: RateLimitRule
): Promise<RateLimitResult> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.rpc("rate_limit_hit", {
    p_key: `${scope}:${hashForKey(identifier)}`,
    p_max: rule.max,
    p_window_seconds: rule.windowSeconds,
    p_block_seconds: rule.blockSeconds,
  });

  if (error || !Array.isArray(data) || data.length === 0) {
    console.error("rate_limit_hit failed:", error?.message);
    return { allowed: false, retryAfterSeconds: 60 };
  }

  const row = data[0] as { allowed: boolean; retry_after_seconds: number };
  return { allowed: row.allowed, retryAfterSeconds: row.retry_after_seconds };
}

/** Convenience: rate limit by the caller's IP address. */
export function rateLimitByIp(scope: string, headers: Headers, rule: RateLimitRule) {
  return rateLimit(scope, getClientIp(headers), rule);
}

/** Clears a counter (for example after a successful login). */
export async function resetRateLimit(scope: string, identifier: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.rpc("rate_limit_reset", {
    p_key: `${scope}:${hashForKey(identifier)}`,
  });
  if (error) console.error("rate_limit_reset failed:", error.message);
}
