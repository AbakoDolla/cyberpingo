import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/config";
import { safeReturnPath } from "@/lib/learning-progress";

const AUTH_PATHS = ["/login", "/register", "/mot-de-passe-oublie"];

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
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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

  // getClaims() verifies the JWT locally (cached JWKS) instead of a network round-trip
  // to Supabase Auth on every navigation; it falls back to getUser() automatically for
  // projects still on legacy shared-secret signing, so this is safe either way.
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims ? { id: claimsData.claims.sub } : null;

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

  if (isAuthPage) {
    if (!user) return response;
    const { data: profile } = await supabase.from("profiles").select("role, onboarding_completed").eq("id", user.id).maybeSingle();
    const isAdmin = profile?.role === "admin";
    if (profile && !profile.onboarding_completed && !isAdmin) return redirectTo("/onboarding");
    return redirectTo(safeReturnPath(request.nextUrl.searchParams.get("next"), isAdmin));
  }

  if (!user) return redirectTo("/login", pathname);

  if (pathname.startsWith("/dashboard")) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "admin") return redirectTo("/courses");
  }

  return response;
}

export const config = {
  matcher: [
    "/login",
    "/register",
    "/mot-de-passe-oublie",
    "/reinitialiser-mot-de-passe",
    "/dashboard/:path*",
    "/courses/:path*",
    "/challenges/:path*",
    "/mentor/:path*",
    "/profile/:path*",
    "/lessons/:path*",
    "/quiz/:path*",
    "/progression/:path*",
    "/parametres/:path*",
    "/onboarding/:path*",
  ],
};