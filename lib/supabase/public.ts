import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { TypedSupabaseClient } from "./client";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./config";

/**
 * Cookie-less anon client for public, server-rendered pages (catalog, certificate verification).
 * It never carries a user session, so responses are identical for every visitor and can be cached.
 * Returns null when the deployment is not connected to Supabase.
 */
export function createSupabasePublicClient(): TypedSupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}