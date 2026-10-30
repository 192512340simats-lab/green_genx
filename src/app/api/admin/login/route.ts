import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { adminMagicLinkSchema } from "@/lib/validation";
import { getClientIp, isSameOrigin, jsonError, readJson } from "@/lib/http";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { publicEnv } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACCEPTED =
  "If this email belongs to an authorized organizer, a sign-in link has been sent.";
const UNAVAILABLE = "We couldn’t send a sign-in link right now. Please try again later.";
const NO_STORE = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Request blocked.", 403);

  const body = await readJson(request);
  const parsed = adminMagicLinkSchema.safeParse(body);
  if (!parsed.success) return jsonError("Enter a valid email address.", 400, undefined, NO_STORE);
  const { email } = parsed.data;

  // Rate limit before checking the allow-list or sending mail.
  const ip = getClientIp(request.headers);
  let byIp;
  let byEmail;
  try {
    [byIp, byEmail] = await Promise.all([
      rateLimit("admin-magic-link-ip", ip, LIMITS.adminLoginPerIp),
      rateLimit("admin-magic-link-email", email, LIMITS.adminLoginPerEmail),
    ]);
  } catch (cause) {
    console.error("admin magic-link rate limit could not run:", cause instanceof Error ? cause.message : "unknown error");
    return jsonError(UNAVAILABLE, 503, undefined, NO_STORE);
  }
  if (!byIp.allowed || !byEmail.allowed) {
    const retry = Math.max(byIp.retryAfterSeconds, byEmail.retryAfterSeconds);
    return jsonError(
      `Too many login attempts. Try again in ${Math.ceil(retry / 60)} minute(s).`,
      429,
      { retryAfterSeconds: retry },
      { ...NO_STORE, "Retry-After": String(retry) }
    );
  }

  try {
    const adminSupabase = createSupabaseServiceClient();
    const { data: profile, error: profileError } = await adminSupabase
      .from("admin_profiles")
      .select("user_id")
      .eq("email", email)
      .maybeSingle();

    if (profileError) {
      console.error("admin allow-list lookup failed:", profileError.message);
      return jsonError(UNAVAILABLE, 503, undefined, NO_STORE);
    }

    // Keep the response identical for authorized and unauthorized addresses.
    if (!profile) return NextResponse.json({ ok: true, message: ACCEPTED }, { headers: NO_STORE });

    const supabase = await createSupabaseServerClient();
    const emailRedirectTo = new URL("/auth/callback", publicEnv.siteUrl).toString();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo,
        shouldCreateUser: false,
      },
    });

    if (error) {
      console.error("admin magic-link email request failed:", {
        code: error.code ?? "unknown",
        message: error.message,
      });
      return jsonError(UNAVAILABLE, 503, undefined, NO_STORE);
    }
  } catch (cause) {
    console.error("admin magic-link request failed:", cause instanceof Error ? cause.message : "unknown error");
    return jsonError(UNAVAILABLE, 503, undefined, NO_STORE);
  }

  return NextResponse.json({ ok: true, message: ACCEPTED }, { headers: NO_STORE });
}
