// app/lib/auth.ts
import jwt from 'jsonwebtoken'
import { cookies, type ReadonlyRequestCookies } from 'next/headers'
import { NextResponse } from 'next/server'

const COOKIE_NAME = 'sid'
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me'

// --- token helpers -----------------------------------------------------------

export function issueSid(userId: string) {
  return jwt.sign({ uid: userId }, JWT_SECRET, { expiresIn: '30d' })
}

function verifySid(token: string): { uid: string } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { uid: string }
    if (!payload?.uid) return null
    return payload
  } catch {
    return null
  }
}

/**
 * Attach/clear auth cookie on a JSON response.
 * Pass a non-empty token to set, or '' to clear.
 */
export function jsonWithAuthCookie<T>(data: T, token: string) {
  const res = NextResponse.json(data)

  // Clear if token === '' (maxAge 0). Otherwise set for 30 days.
  res.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: token ? 60 * 60 * 24 * 30 : 0,
  })

  return res
}

/**
 * Read session from the current request cookies() store.
 * Returns `{ uid }` or `null`.
 */
export async function readSession(): Promise<{ uid: string } | null> {
  const token = cookies().get(COOKIE_NAME)?.value
  if (!token) return null
  const payload = verifySid(token)
  return payload ? { uid: payload.uid } : null
}

/**
 * Extract userId (uid) from either:
 *  - a `ReadonlyRequestCookies` (preferred), or
 *  - a `Headers` object (fallback from Route Handlers), or
 *  - if nothing passed, from `cookies()`.
 */
export async function getUserIdFromCookie(
  source?: ReadonlyRequestCookies | Headers
): Promise<string | null> {
  try {
    let token: string | undefined

    // If it's a cookies-like object (has .get returning a cookie)
    if (source && 'get' in source) {
      const cookieVal = (source as ReadonlyRequestCookies).get(COOKIE_NAME)?.value
      token = cookieVal
    } else if (source instanceof Headers) {
      const cookieHeader = source.get('cookie') || source.get('Cookie') || ''
      const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`))
      token = match?.[1]
    } else {
      token = cookies().get(COOKIE_NAME)?.value
    }

    if (!token) return null
    const payload = verifySid(token)
    return payload?.uid ?? null
  } catch {
    return null
  }
}