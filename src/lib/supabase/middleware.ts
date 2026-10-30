import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session cookie on every matched request and returns
 * the authenticated user ID (or null). Runs on the Edge runtime, so it must not
 * import Node-only modules.
 *
 * `getClaims()` verifies the JWT signature and expiry; with asymmetric signing
 * keys this avoids an Auth server round trip. Symmetric keys still use the
 * Auth server for verification.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  const { data, error } = await supabase.auth.getClaims();
  const userId = !error ? data?.claims?.sub : undefined;

  return { response, user: userId ? { id: userId } : null };
}
