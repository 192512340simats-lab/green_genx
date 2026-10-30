import { NextResponse, type NextRequest } from "next/server";
import { getAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

const NO_STORE = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
};

function redirectTo(path: string) {
  return NextResponse.redirect(new URL(path, publicEnv.siteUrl), {
    headers: NO_STORE,
  });
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return redirectTo("/admin?error=link");

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("admin auth callback code exchange failed:", error.message);
      return redirectTo("/admin?error=link");
    }

    // A valid Supabase session is not sufficient: re-check the admin allow-list.
    const admin = await getAdmin();
    if (!admin) {
      await supabase.auth.signOut();
      return redirectTo("/admin?error=link");
    }

    return redirectTo("/admin/dashboard");
  } catch (cause) {
    console.error("admin auth callback failed:", cause instanceof Error ? cause.message : "unknown error");
    return redirectTo("/admin?error=link");
  }
}
