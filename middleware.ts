import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Edge-safe middleware: only checks cookie presence, no JWT verify here.
// Full verification remains inside server routes using Node runtime.
const COOKIE = "sa_token";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected =
    pathname.startsWith("/wheel") || pathname.startsWith("/admin");

  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get(COOKIE)?.value;
  if (!token) {
    const url = new URL("/login", req.url);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/wheel/:path*", "/admin/:path*"]
};
