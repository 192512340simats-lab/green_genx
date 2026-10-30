import "server-only";
import { createHmac } from "crypto";
import { NextResponse } from "next/server";
import { publicEnv, serverEnv } from "@/lib/env";

/** Best-effort client IP behind Vercel / proxies. */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim() || "unknown";
  return headers.get("x-real-ip")?.trim() || "unknown";
}

/** HMAC a value (IP, email) so raw personal data is never stored as a rate-limit key. */
export function hashForKey(value: string): string {
  return createHmac("sha256", serverEnv.appSecret).update(value).digest("hex").slice(0, 32);
}

/** Consistent JSON error response. */
export function jsonError(
  message: string,
  status: number,
  extra?: Record<string, unknown>,
  headers?: Record<string, string>
) {
  return NextResponse.json({ error: message, ...extra }, { status, headers });
}

/**
 * CSRF defence for state-changing requests (POST/PUT/PATCH/DELETE).
 * Browsers always send an Origin header on these; we require it to match this
 * site. Combined with SameSite=Lax cookies this blocks cross-site forgery.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }

  const allowed = new Set<string>();
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host) allowed.add(host);
  try {
    allowed.add(new URL(publicEnv.siteUrl).host);
  } catch {
    /* ignore invalid site URL */
  }
  return allowed.has(originHost);
}

/** Reads a JSON body safely; returns null if missing or malformed. */
export async function readJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
