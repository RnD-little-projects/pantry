import { NextResponse, type NextRequest } from "next/server";

const publicPaths = ["/", "/login", "/unauthorized", "/session", "/api/auth", "/api/public-order"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return NextResponse.next();
  }

  const hasSession = Boolean(
    request.cookies.get("authjs.session-token") || request.cookies.get("__Secure-authjs.session-token"),
  );

  if (!hasSession) {
    const url = new URL("/login", request.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|manifest.json|sw.js|workbox-.*).*)"],
};
