// app/lib/auth.ts
import jwt from 'jsonwebtoken'
import {
  cookies as nextCookies,
  type ReadonlyRequestCookies,
} from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * Cookie / JWT settings
 */
const COOKIE_NAME = 'sid'
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret' // set JWT_SECRET in Vercel

// ------------------------------------------------------------------
// JWT helpers
// ------------------------------------------------------------------

/** Create a signed session token for a user id. */
export function issueSid(uid: string): string {
  // 30 days expiry; adjust as needed
  return jwt.sign({ uid }, JWT_SECRET, { expiresIn: '30d' })
}

/** Verify a token and return payload or null. */
function verifySid(token: string): { uid: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { uid: string }
  } catch {
    return null
  }
}

// ------------------------------------------------------------------
// Cookie helpers (work in both Edge & Node on Vercel)
// ------------------------------------------------------------------

/**
 * Read user id from cookies or headers.
 * - Pass `cookies()` (ReadonlyRequestCookies) from server code, OR
 * - Pass `req.headers` (Headers) from route handlers, OR
 * - Pass nothing (it will call cookies() internally).
 */
export async function getUserIdFromCookie(
  source?: ReadonlyRequestCookies | Headers
): Promise<string | null> {
  // Case 1: no arg -> use global cookies()
  if (!source) {
    const token = nextCookies().get(COOKIE_NAME)?.value
    if (!token) return null
    const payload = verifySid(token)
    return payload?.uid ?? null
  }

  // Case 2: ReadonlyRequestCookies (has .get but NOT .append)
  if ('get' in source && !('append' in source)) {
    const token = source.get(COOKIE_NAME)?.value
    if (!token) return null
    const payload = verifySid(token)
    return payload?.uid ?? null
  }

  // Case 3: Headers (has .append method)
  if (source instanceof Headers) {
    const raw = source.get('cookie')
    if (!raw) return null

    const map = new Map<string, string>()
    for (const part of raw.split(';')) {
      const [k, ...rest] = part.trim().split('=')
      if (!k) continue
      map.set(k, decodeURIComponent(rest.join('=') ?? ''))
    }

    const token = map.get(COOKIE_NAME)
    if (!token) return null
    const payload = verifySid(token)
    return payload?.uid ?? null
  }

  return null
}

/**
 * Return a JSON response and (optionally) set/clear the auth cookie.
 * Usage:
 *   jsonWithAuthCookie({ ok: true }, { token })        // set cookie
 *   jsonWithAuthCookie({ ok: true }, { token: '' })    // clear cookie
 *   jsonWithAuthCookie({ ok: true })                   // just JSON
 */
export function jsonWithAuthCookie<T>(
  body: T,
  opts?: { token?: string; maxAgeDays?: number }
): NextResponse<T> {
  const res = NextResponse.json(body)
  if (!opts) return res

  // If token is provided, set cookie. If token === '', clear it.
  if (typeof opts.token === 'string') {
    if (opts.token === '') {
      res.cookies.set(COOKIE_NAME, '', {
        httpOnly: true,
        sameSite: 'lax',
        secure: true,
        path: '/',
        maxAge: 0,
      })
      return res
    }

    const maxAgeSec = Math.floor((opts.maxAgeDays ?? 30) * 24 * 60 * 60)
    res.cookies.set(COOKIE_NAME, opts.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: maxAgeSec,
    })
  }

  return res
}

/** Optional tiny helper some routes import. */
export async function readSession():
  Promise<{ uid: string } | null> {
  const uid = await getUserIdFromCookie()
  return uid ? { uid } : null
}