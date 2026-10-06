import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/config";
import { safeReturnPath } from "@/lib/navigation";
import { canAccessAdminPath } from "@/lib/admin-access";
import { isStaff } from "@/lib/roles";
import { inspectRequest } from "@/lib/security/waf";
import type { Database } from "@/types/database.types";

const AUTH_PATHS = ["/login", "/register", "/mot-de-passe-oublie"];
/** Catalogue pages visitors may browse before creating an account (RLS only exposes published content). */
const GUEST_PATHS = ["/courses", "/challenges"];

const matchesPath = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`);

function applySecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-XSS-Protection", "1; mode=block");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(self), geolocation=()");
  res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  res.headers.set("X-CyberPingo-Shield", "active-v2");
  return res;
}

/**
 * First line of defence only: it keeps visitors out of the private app and learners out of /admin
 * (as a 404). Every read and write is still enforced by Row Level Security and the SQL functions.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── Layer 1: WAF & SOC Telemetry Engine ──────────────────────────────────────
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1";

  const wafDecision = inspectRequest({
    ip: clientIp,
    url: request.url,
    method: request.method,
    headers: request.headers,
  });

  if (!wafDecision.allowed) {
    const isRateLimit = wafDecision.status === 429;
    const errorBody = {
      error: wafDecision.reason || "Requête interceptée par le bouclier WAF CyberPingo.",
      code: isRateLimit ? "CYBERPINGO_RATE_LIMIT" : "CYBERPINGO_WAF_BLOCK",
      threat: wafDecision.threat
        ? {
            technique: wafDecision.threat.technique,
            category: wafDecision.threat.category,
            severity: wafDecision.threat.severity,
          }
        : undefined,
    };
    const blockedResponse = NextResponse.json(errorBody, {
      status: wafDecision.status || 403,
      headers: {
        "X-CyberPingo-Shield": isRateLimit ? "rate-limited" : "blocked",
        "Retry-After": String(wafDecision.retryAfter || (isRateLimit ? 60 : 3600)),
      },
    });
    if (wafDecision.rateLimit) {
      blockedResponse.headers.set("X-RateLimit-Limit", String(wafDecision.rateLimit.limit));
      blockedResponse.headers.set("X-RateLimit-Remaining", String(wafDecision.rateLimit.remaining));
      blockedResponse.headers.set("X-RateLimit-Reset", String(wafDecision.rateLimit.reset));
    }
    return applySecurityHeaders(blockedResponse);
  }

  // API routes manage their own authentication and response payloads
  if (pathname.startsWith("/api/")) {
    const res = NextResponse.next({ request });
    if (wafDecision.rateLimit) {
      res.headers.set("X-RateLimit-Limit", String(wafDecision.rateLimit.limit));
      res.headers.set("X-RateLimit-Remaining", String(wafDecision.rateLimit.remaining));
      res.headers.set("X-RateLimit-Reset", String(wafDecision.rateLimit.reset));
    }
    return applySecurityHeaders(res);
  }

  const isAuthPage = AUTH_PATHS.some((path) => pathname.startsWith(path));
  const isGuestPage = GUEST_PATHS.some((path) => matchesPath(pathname, path));

  if (!isSupabaseConfigured) {
    if (pathname === "/" || isAuthPage || isGuestPage) return applySecurityHeaders(NextResponse.next());
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return applySecurityHeaders(NextResponse.redirect(loginUrl));
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
    return applySecurityHeaders(redirect);
  };

  const loadProfile = async (id: string) =>
    (await supabase.from("profiles").select("role, onboarding_completed").eq("id", id).maybeSingle()).data;

  // A returning learner who opens the site directly (typed URL, bookmark, external link) lands in
  // their space; in-app navigation to "Accueil" (same-origin) still shows the public landing page.
  if (pathname === "/") {
    const fetchSite = request.headers.get("sec-fetch-site");
    const directEntry = fetchSite === "none" || fetchSite === "cross-site";
    if (!userId || !directEntry) return applySecurityHeaders(response);
    const profile = await loadProfile(userId);
    if (!profile) return applySecurityHeaders(response);
    if (!profile.onboarding_completed && !isStaff(profile.role)) return redirectTo("/onboarding");
    return redirectTo(safeReturnPath(null, profile.role));
  }

  if (isAuthPage) {
    if (!userId) return applySecurityHeaders(response);
    const profile = await loadProfile(userId);
    const staff = isStaff(profile?.role);
    if (profile && !profile.onboarding_completed && !staff) return redirectTo("/onboarding");
    return redirectTo(safeReturnPath(request.nextUrl.searchParams.get("next"), profile?.role));
  }

  if (!userId) return isGuestPage ? applySecurityHeaders(response) : redirectTo("/login", pathname);

  if (pathname.startsWith("/admin")) {
    const profile = await loadProfile(userId);
    // Learners must not even learn that the console exists: they get the same 404 as any unknown URL.
    if (!isStaff(profile?.role)) {
      const hidden = NextResponse.rewrite(new URL("/_not-found", request.url), { status: 404 });
      response.cookies.getAll().forEach((cookie) => hidden.cookies.set(cookie));
      hidden.headers.set("x-robots-tag", "noindex");
      return applySecurityHeaders(hidden);
    }
    if (!canAccessAdminPath(profile?.role, pathname)) return redirectTo("/admin");
  }

  return applySecurityHeaders(response);
}

export const config = {
  matcher: [
    "/",
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
    "/competences/:path*",
    "/parametres/:path*",
    "/notifications/:path*",
    "/onboarding/:path*",
    "/api/:path*",
  ],
};
