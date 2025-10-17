import { cookies as nextCookies, type ReadonlyRequestCookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { NextResponse } from 'next/server'

const COOKIE_NAME = 'sid'
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'

// Existing verifySid remains the same
function verifySid(token: string): { uid: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { uid: string }
  } catch {
    return null
  }
}

// ✅ Replace this whole function:
export async function getUserIdFromCookie(
  source?: Headers | ReadonlyRequestCookies
): Promise<string | null> {
  // Case 1: When no argument, use cookies() (e.g., in server components)
  if (!source) {
    const c = nextCookies().get(COOKIE_NAME)?.value
    if (!c) return null
    const payload = verifySid(c)
    return payload?.uid ?? null
  }

  // Case 2: Called with ReadonlyRequestCookies
  if ('get' in source && !('append' in source)) {
    const token = source.get(COOKIE_NAME)?.value
    if (!token) return null
    const payload = verifySid(token)
    return payload?.uid ?? null
  }

  // Case 3: Called with Headers
  if (source instanceof Headers) {
    const raw = source.get('cookie')
    if (!raw) return null
    const cookies = raw.split(';').reduce((acc, c) => {
      const [k, v] = c.trim().split('=')
      if (k) acc[k] = decodeURIComponent(v || '')
      return acc
    }, {} as Record<string, string>)
    const token = cookies[COOKIE_NAME]
    if (!token) return null
    const payload = verifySid(token)
    return payload?.uid ?? null
  }

  return null
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