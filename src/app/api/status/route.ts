import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { isSameOrigin, jsonError, readJson } from "@/lib/http";
import { LIMITS, rateLimitByIp } from "@/lib/rate-limit";
import { statusLookupSchema } from "@/lib/validation";
import { verifyStatusToken } from "@/lib/tokens";
import { backendConfigurationError } from "@/lib/server-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Request blocked.", 403);
  const configurationError = backendConfigurationError();
  if (configurationError) return jsonError(`Status lookup setup is incomplete: ${configurationError} See README.md.`, 503);

  const limit = await rateLimitByIp("status-lookup", request.headers, LIMITS.statusLookupPerIp);
  if (!limit.allowed) {
    return jsonError(
      `Too many lookups. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minute(s).`,
      429,
      undefined,
      { "Retry-After": String(limit.retryAfterSeconds), "Cache-Control": "no-store" }
    );
  }

  const body = await readJson(request);
  const parsed = statusLookupSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Enter your registration ID and private status token.", 400);
  }

  const supabase = createSupabaseServiceClient();
  const { data: registration, error } = await supabase
    .from("registrations")
    .select("registration_code, category, team_name, project_title, status, rejection_reason, payment_status, total_fee, updated_at, status_token_hash")
    .eq("registration_code", parsed.data.registrationCode)
    .maybeSingle();

  if (error) {
    console.error("status lookup failed:", error.message);
    return jsonError("Could not check the registration right now. Please try again later.", 503);
  }

  if (!registration || !verifyStatusToken(parsed.data.token, registration.status_token_hash)) {
    return jsonError("We couldn’t find a registration with those details.", 404, undefined, { "Cache-Control": "no-store" });
  }

  return NextResponse.json(
    {
      registrationCode: registration.registration_code,
      category: registration.category,
      teamName: registration.team_name,
      projectTitle: registration.project_title,
      status: registration.status,
      rejectionReason: registration.rejection_reason,
      paymentStatus: registration.payment_status,
      totalFee: registration.total_fee,
      updatedAt: registration.updated_at,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
