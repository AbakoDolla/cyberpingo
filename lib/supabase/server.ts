import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { AppError } from "@/lib/errors";
import { asRole, isStaff } from "@/lib/roles";
import type { Database } from "@/types/database.types";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./config";

export async function createSupabaseServerClient() {
  if (!isSupabaseConfigured) throw new AppError("not_configured");
  const cookieStore = await cookies();
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot write cookies; the middleware refreshes the session instead.
        }
      },
    },
  });
}

/** Returns the signed-in user and their role for route handlers. */
export async function getRequestUser() {
  const supabase = await createSupabaseServerClient();
  // getClaims() verifies the JWT locally (cached JWKS) instead of a network round-trip
  // to Supabase Auth, falling back to getUser() automatically when unavailable.
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub ?? null;
  if (!userId) return { supabase, user: null, role: null, isAdmin: false };
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  const role = data ? asRole(data.role) : null;
  return { supabase, user: { id: userId }, role, isAdmin: isStaff(role) };
}
