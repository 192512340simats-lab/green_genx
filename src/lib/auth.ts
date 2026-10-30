import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface AdminContext {
  user: { id: string };
  email: string;
  fullName: string | null;
  /** Supabase client acting as the logged-in admin (Row Level Security applies). */
  supabase: SupabaseClient;
}

/**
 * Returns the admin context ONLY if:
 *  1. there is a valid session (JWT signature and expiry verified by Supabase Auth), and
 *  2. that user has a row in public.admin_profiles.
 * Otherwise returns null. Being logged in is NOT enough to be an admin.
 */
export const getAdmin = cache(async (): Promise<AdminContext | null> => {
  const supabase = await createSupabaseServerClient();

  const { data, error: claimsError } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (claimsError || !userId) return null;

  // The RLS policy "admin reads own profile" lets an admin read only their own row.
  const { data: profile, error: profileError } = await supabase
    .from("admin_profiles")
    .select("email, full_name")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileError || !profile) return null;

  return {
    user: { id: userId },
    email: profile.email as string,
    fullName: (profile.full_name as string | null) ?? null,
    supabase,
  };
});

/**
 * Use at the top of EVERY admin page and admin layout (Server Components).
 * Redirects to the login page if the visitor is not an authorized admin.
 *
 * Note: Next.js does not re-run a layout when navigating between its child
 * pages, so the layout guard is not enough by itself - each page calls this too.
 */
export async function requireAdminPage(): Promise<AdminContext> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin");
  return admin;
}

export type AdminApiResult =
  | { ok: true; admin: AdminContext }
  | { ok: false; response: NextResponse };

/**
 * Use at the top of EVERY /api/admin/* route handler:
 *
 *   const auth = await requireAdminApi();
 *   if (!auth.ok) return auth.response;
 *   const { admin } = auth;
 */
export async function requireAdminApi(): Promise<AdminApiResult> {
  const admin = await getAdmin();
  if (!admin) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "You are not authorized to perform this action." },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      ),
    };
  }
  return { ok: true, admin };
}
