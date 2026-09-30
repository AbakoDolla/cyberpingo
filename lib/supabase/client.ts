"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, missingConfigMessage, supabaseAnonKey, supabaseUrl } from "./config";

let client: SupabaseClient | null = null;

export function getSupabaseBrowserClient() {
  if (!isSupabaseConfigured) throw new Error(missingConfigMessage);
  client ??= createBrowserClient(supabaseUrl, supabaseAnonKey);
  return client;
}
