import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * First line of defence for the admin area: requires a valid Supabase session.
 *
 * IMPORTANT: this only proves "someone is logged in". The check that the user
 * is actually an administrator (a row in public.admin_profiles) happens on the
 * server in requireAdminPage() / requireAdminApi(), which every admin page and
 * every admin API route calls. Middleware alone is never trusted.
 */
export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const path = request.nextUrl.pathname;

  const isAdminApi = path.startsWith("/api/admin");
  const isLoginApi = path === "/api/admin/login";
  const isLoginPage = path === "/admin" || path === "/admin/";

  if (!user) {
    if (isAdminApi && !isLoginApi) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }
    if (!isAdminApi && !isLoginPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  // Never cache anything in the admin area.
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
