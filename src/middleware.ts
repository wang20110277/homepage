import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const sessionToken =
    request.cookies.get("__Secure-better-auth.session_token") ??
    request.cookies.get("better-auth.session_token");
  const { pathname } = request.nextUrl;

  const publicPaths = ["/", "/unauthorized", "/api/auth"];
  const isPublicPath = publicPaths.some((path) => pathname === path || pathname.startsWith(path + "/"));
  const isApiRoute = pathname.startsWith("/api/");

  if (!sessionToken && !isPublicPath) {
    // For API routes, return 401 JSON error instead of redirecting
    if (isApiRoute) {
      return NextResponse.json(
        { error: "Unauthorized", message: "请先登录" },
        { status: 401 }
      );
    }

    // Redirect to landing page with callback URL
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|favicon.png|.*\\.(?:png|jpg|jpeg|svg|gif|webp)).*)"],
};
