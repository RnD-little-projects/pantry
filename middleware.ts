import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";

const publicPaths = ["/", "/login", "/unauthorized", "/session", "/api/auth", "/api/public-order"];

export default auth(async (request) => {
  const { pathname } = request.nextUrl;
  const session = request.auth;

  // 1. Allow public paths
  if (publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return NextResponse.next();
  }

  // 2. Check for session
  if (!session) {
    const url = new URL("/login", request.url);
    return NextResponse.redirect(url);
  }

  // 3. Handle forced password change
  const isForceChangePage = pathname === "/auth/force-password-change";
  const needsForceChange = session.user?.forcePasswordChange;

  if (needsForceChange && !isForceChangePage && !pathname.startsWith("/api")) {
    const url = new URL("/auth/force-password-change", request.url);
    return NextResponse.redirect(url);
  }

  // 4. Prevent accessing force change page if not needed
  if (!needsForceChange && isForceChangePage) {
    const url = new URL("/", request.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next|favicon.ico|manifest.json|sw.js|workbox-.*).*)"],
};
