import { NextRequest, NextResponse } from "next/server";

const AUTH_PATHS = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.get("cyberpingo_session")?.value === "1";
  const isAdmin = request.cookies.get("cyberpingo_role")?.value === "admin";

  // Pages d'auth : rediriger si déjà connecté
  if (AUTH_PATHS.some((p) => pathname.startsWith(p))) {
    if (hasSession) {
      const dest = isAdmin ? "/dashboard" : "/courses";
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return NextResponse.next();
  }

  // Non connecté : rediriger vers /login avec ?next=
  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // /dashboard reservé aux admins
  if (pathname.startsWith("/dashboard") && !isAdmin) {
    return NextResponse.redirect(new URL("/courses", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/register",
    "/dashboard/:path*",
    "/courses/:path*",
    "/challenges/:path*",
    "/mentor/:path*",
    "/profile/:path*",
    "/lessons/:path*",
    "/quiz/:path*",
  ],
};
