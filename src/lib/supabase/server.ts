import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { assertPublicEnv, publicEnv } from "@/lib/env";

/**
 * Supabase client bound to the current request's cookies (the logged-in user's
 * session). It still uses the anon key, so Row Level Security applies to it.
 * Use for: reading the current admin, admin dashboard queries, public content.
 */
export async function createSupabaseServerClient() {
  assertPublicEnv();
  const cookieStore = await cookies(); // async in Next.js 15

  return createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // The middleware refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}
