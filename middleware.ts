import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";

const publicPaths = ["/", "/login", "/unauthorized", "/session", "/api/auth", "/api/public-order"];

export default auth(async (request) => {
  const { pathname } = request.nextUrl;
  const session = request.auth;

  // Always set x-pathname for server components
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  // 1. Handle forced password change for logged-in users (High Priority)
  if (session?.user?.forcePasswordChange) {
    const isForceChangePage = pathname === "/auth/force-password-change";
    if (!isForceChangePage && !pathname.startsWith("/api") && pathname !== "/login") {
      const url = new URL("/auth/force-password-change", request.url);
      return NextResponse.redirect(url);
    }
  }

  // 2. Allow public paths
  if (publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // 2. Check for session (for non-public paths)
  if (!session) {
    const url = new URL("/login", request.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
});

export const config = {
  matcher: ["/((?!_next|favicon.ico|manifest.json|sw.js|workbox-.*).*)"],
};
