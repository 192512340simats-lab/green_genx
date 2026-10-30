import "server-only";
import { publicEnv } from "@/lib/env";

export function publicSupabaseConfigurationError(): string | null {
  if (!publicEnv.supabaseUrl) return "Missing NEXT_PUBLIC_SUPABASE_URL.";
  if (!publicEnv.supabaseAnonKey) return "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY.";
  return null;
}

export function backendConfigurationError(): string | null {
  const publicError = publicSupabaseConfigurationError();
  if (publicError) return publicError;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return "Missing SUPABASE_SERVICE_ROLE_KEY.";
  if (!process.env.APP_SECRET || process.env.APP_SECRET.length < 32) return "APP_SECRET must be set and at least 32 characters.";
  return null;
}
