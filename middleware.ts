import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const COOKIE = "sa_token";
const JWT_SECRET = process.env.JWT_SECRET!;

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(COOKIE)?.value;

  const protectedPaths = ["/wheel", "/admin"];
  const isProtected = protectedPaths.some(p => pathname.startsWith(p));

  if (!isProtected) return NextResponse.next();

  let valid = false;
  if (token) {
    try { jwt.verify(token, JWT_SECRET); valid = true; } catch {}
  }
  if (!valid) {
    const url = new URL("/login", req.url);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/wheel/:path*", "/admin/:path*"]
};
