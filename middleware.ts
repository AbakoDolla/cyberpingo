import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/config";
import { safeReturnPath } from "@/lib/navigation";
import { isStaff } from "@/lib/roles";
import type { Database } from "@/types/database.types";

const AUTH_PATHS = ["/login", "/register", "/mot-de-passe-oublie"];

/**
 * First line of defence only: it keeps visitors out of the app and learners out of /admin.
 * Every read and write is still enforced by Row Level Security and the SQL functions.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthPage = AUTH_PATHS.some((path) => pathname.startsWith(path));

  if (!isSupabaseConfigured) {
    if (isAuthPage) return NextResponse.next();
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // getClaims() verifies the JWT locally (cached JWKS) instead of a network round-trip to Supabase
  // Auth on every navigation, and falls back to getUser() for legacy shared-secret projects.
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub ?? null;

  const redirectTo = (path: string, next?: string) => {
    const url = new URL(path, request.url);
    if (next) url.searchParams.set("next", next);
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    for (const key of ["cache-control", "expires", "pragma"]) {
      const value = response.headers.get(key);
      if (value) redirect.headers.set(key, value);
    }
    return redirect;
  };

  const loadProfile = async (id: string) =>
    (await supabase.from("profiles").select("role, onboarding_completed").eq("id", id).maybeSingle()).data;

  if (isAuthPage) {
    if (!userId) return response;
    const profile = await loadProfile(userId);
    const staff = isStaff(profile?.role);
    if (profile && !profile.onboarding_completed && !staff) return redirectTo("/onboarding");
    return redirectTo(safeReturnPath(request.nextUrl.searchParams.get("next"), profile?.role));
  }

  if (!userId) return redirectTo("/login", pathname);

  if (pathname.startsWith("/admin")) {
    const profile = await loadProfile(userId);
    if (!isStaff(profile?.role)) return redirectTo("/dashboard");
  }

  return response;
}

export const config = {
  matcher: [
    "/login",
    "/register",
    "/mot-de-passe-oublie",
    "/reinitialiser-mot-de-passe",
    "/admin/:path*",
    "/dashboard/:path*",
    "/courses/:path*",
    "/challenges/:path*",
    "/mentor/:path*",
    "/profile/:path*",
    "/lessons/:path*",
    "/quiz/:path*",
    "/progression/:path*",
    "/parametres/:path*",
    "/notifications/:path*",
    "/onboarding/:path*",
  ],
};
