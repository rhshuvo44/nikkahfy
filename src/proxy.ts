import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic gate only.
 *
 * The presence of a session cookie is cheap to check and lets anonymous visitors
 * be redirected before any protected page renders. It is NOT authorization: a
 * forged/expired cookie still gets past this file. Every protected layout and
 * every server action re-verifies the session server-side via
 * `requireUser()` / `requireSuperAdmin()` in `@/lib/auth/session`.
 */

const COOKIE_CONFIG = { cookiePrefix: "nikkahfy" } as const;

export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request, COOKIE_CONFIG);

  if (sessionCookie) {
    return NextResponse.next();
  }

  const { pathname, search } = request.nextUrl;
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
