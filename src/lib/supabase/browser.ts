"use client";

import { createBrowserClient } from "@supabase/ssr";
import { assertPublicEnv, publicEnv } from "@/lib/env";

/**
 * Supabase client for browser code. Uses the public anon key only, so it can
 * do nothing that Row Level Security does not allow. All sensitive actions in
 * this project go through server route handlers instead.
 */
export function createSupabaseBrowserClient() {
  assertPublicEnv();
  return createBrowserClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey);
}
