// app/lib/auth.ts
import jwt from 'jsonwebtoken'
import { cookies, headers as nextHeaders } from 'next/headers'
import { NextResponse } from 'next/server'

const COOKIE_NAME = 'sid'
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'

// ------------------------------------------------------------------
// Token helpers
// ------------------------------------------------------------------
export function issueSid(userId: string) {
  // 30 days
  return jwt.sign({ uid: userId }, JWT_SECRET, { expiresIn: '30d' })
}

export function verifySid(token: string): { uid: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { uid: string }
  } catch {
    return null
  }
}

// ------------------------------------------------------------------
// Cookie helpers (works with both Edge & Node runtimes on Vercel)
// ------------------------------------------------------------------
function cookieHeaderToMap(cookieHeader: string | null): Map<string, string> {
  const map = new Map<string, string>()
  if (!cookieHeader) return map
  for (const part of cookieHeader.split(';')) {
    const [k, ...rest] = part.trim().split('=')
    const v = rest.join('=')
    if (k) map.set(k, decodeURIComponent(v ?? ''))
  }
  return map
}

export async function getUserIdFromCookie(
  hdrs: Headers | undefined = undefined
): Promise<string | null> {
  // If headers are not provided (e.g., in server components), read from server cookies()
  if (!hdrs) {
    const c = cookies().get(COOKIE_NAME)?.value
    if (!c) return null
    const payload = verifySid(c)
    return payload?.uid ?? null
  }

  // When called inside an API Route with Request.headers
  const raw = hdrs.get('cookie')
  const map = cookieHeaderToMap(raw)
  const token = map.get(COOKIE_NAME)
  if (!token) return null
  const payload = verifySid(token)
  return payload?.uid ?? null
}

/**
 * Sends JSON and sets/clears the auth cookie.
 * Pass a token string to set; pass '' (empty string) to clear.
 */
export function jsonWithAuthCookie<T extends Record<string, any>>(
  body: T,
  token: string
) {
  const res = NextResponse.json(body)

  if (token) {
    // IMPORTANT for Vercel HTTPS on mobile browsers:
    // sameSite:'none' + secure:true so the cookie is accepted.
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })
  } else {
    // clear cookie
    res.cookies.set(COOKIE_NAME, '', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 0,
    })
  }

  return res
}

// Convenience for server components/middleware that only need current UID
export function readSession(): { userId: string | null } {
  const c = cookies().get(COOKIE_NAME)?.value
  if (!c) return { userId: null }
  const payload = verifySid(c)
  return { userId: payload?.uid ?? null }
}