import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

let supabaseClient: SupabaseClient | null = null;

/**
 * Get Supabase client instance (singleton)
 * Used for auth token verification
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabaseClient;
}

/**
 * Get Supabase JWT secret for manual verification
 * JWT secret is derived from service role key
 */
export function getSupabaseJwtSecret(): string | null {
  return env.SUPABASE_SERVICE_ROLE_KEY || null;
}
