/**
 * Environment access.
 *
 * NEXT_PUBLIC_* values must be referenced with a literal `process.env.NAME`
 * so Next.js can inline them into browser code. Server-only secrets are read
 * lazily and throw a clear error if missing.
 */

export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, ""),
};

export function assertPublicEnv(): void {
  if (!publicEnv.supabaseUrl || !publicEnv.supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Copy .env.local.example to .env.local and fill in the values, then restart `npm run dev`."
    );
  }
}

/** Server-only secrets. Never import this file's `serverEnv` from client components. */
export const serverEnv = {
  get serviceRoleKey(): string {
    const v = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!v) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY (server-only secret).");
    return v;
  },
  get appSecret(): string {
    const v = process.env.APP_SECRET;
    if (!v || v.length < 32) {
      throw new Error("APP_SECRET must be set and at least 32 characters long.");
    }
    return v;
  },
};
