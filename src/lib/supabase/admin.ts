import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { assertPublicEnv, publicEnv, serverEnv } from "@/lib/env";

let cached: SupabaseClient | null = null;

/**
 * SERVICE-ROLE client. Bypasses Row Level Security completely.
 *
 * Rules for using it:
 *  - Import it only in route handlers / server code (the `server-only`
 *    import above makes the build fail if a client component imports it).
 *  - Authorize the caller BEFORE using it (requireAdminApi(), rate limit, etc.).
 *  - Never return its raw rows to the public; select only the columns needed.
 */
export function createSupabaseServiceClient(): SupabaseClient {
  if (cached) return cached;
  assertPublicEnv();
  cached = createClient(publicEnv.supabaseUrl, serverEnv.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return cached;
}
