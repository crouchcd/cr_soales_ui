import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { absoluteUrl } from "@/lib/absolute-url";
import { verifyAccessToken } from "@/lib/access-token";

const COOKIE_NAME = "cr_soales_access";

const isProtectedPath = (pathname: string) => {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/upload") ||
    pathname.startsWith("/papers")
  );
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const secret = process.env.ACCESS_COOKIE_SECRET;

  if (!secret) {
    return new NextResponse("Missing ACCESS_COOKIE_SECRET", { status: 500 });
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const authenticated = await verifyAccessToken(token, secret);

  if (pathname === "/login" || pathname === "/access") {
    if (authenticated) {
      return NextResponse.redirect(absoluteUrl(request, "/admin"));
    }
    return NextResponse.next();
  }

  if (isProtectedPath(pathname) && !authenticated) {
    return NextResponse.redirect(absoluteUrl(request, "/login"));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/access",
    "/admin/:path*",
    "/upload/:path*",
    "/papers/:path*",
  ],
};
