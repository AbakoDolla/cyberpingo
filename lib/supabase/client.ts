import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/errors";
import type { Database } from "@/types/database.types";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./config";

export type TypedSupabaseClient = SupabaseClient<Database>;

let client: TypedSupabaseClient | null = null;

/** The single browser client (anon key + the user's session cookie). Never holds the service role. */
export function getSupabaseBrowserClient(): TypedSupabaseClient {
  if (!isSupabaseConfigured) throw new AppError("not_configured");
  client ??= createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
  return client;
}
