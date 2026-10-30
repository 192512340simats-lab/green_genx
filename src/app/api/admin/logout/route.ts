import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSameOrigin, jsonError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Signs the admin out (clears the session cookies) and returns to the login page. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Request blocked.", 403);

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  // 303 turns the form POST into a GET of the login page.
  return NextResponse.redirect(new URL("/admin", request.url), {
    status: 303,
    headers: { "Cache-Control": "no-store" },
  });
}
