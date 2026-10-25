import { NextResponse } from "next/server";
import { auth } from "@/auth";

// API routes check the session themselves and answer 401, which fetch callers expect instead of a redirect
const publicPaths = ["/", "/login", "/register", "/unauthorized", "/api"];

export default auth(async (request) => {
  const { pathname } = request.nextUrl;
  const session = request.auth;

  // 1. Forced password change after an admin reset (pages only; API routes answer for themselves)
  if (session?.user?.forcePasswordChange) {
    const isForceChangePage = pathname === "/auth/force-password-change";
    if (!isForceChangePage && !pathname.startsWith("/api") && pathname !== "/login") {
      return NextResponse.redirect(new URL("/auth/force-password-change", request.url));
    }
  }

  // 2. Allow public paths
  if (publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return NextResponse.next();
  }

  // 3. Everything else needs a session
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
});

export const config = {
  // Skip Next internals and any file with an extension (icons, images, manifest)
  matcher: ["/((?!_next|.*\\..*).*)"],
};
