// app/lib/auth.ts
import jwt from 'jsonwebtoken'
import { cookies, type ReadonlyRequestCookies } from 'next/headers'
import type { NextResponse } from 'next/server'

// ----- config -----
const COOKIE_NAME = 'sid'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7 // 7 days

function getSecret(): string {
  const s = process.env.JWT_SECRET
  if (!s) {
    throw new Error('JWT_SECRET is not set')
  }
  return s
}

// Small cookie parser for plain Headers case
function parseCookieHeader(header: string | null): Record<string, string> {
  const map: Record<string, string> = {}
  if (!header) return map
  header.split(';').forEach((part) => {
    const [k, ...rest] = part.trim().split('=')
    if (!k) return
    map[k] = decodeURIComponent(rest.join('=') || '')
  })
  return map
}

// Create a signed JWT with user id as subject
export function issueSid(userId: string): string {
  return jwt.sign({ sub: userId }, getSecret(), { expiresIn: `${MAX_AGE_SECONDS}s` })
}

// Verify JWT and return user id or null
export function verifySid(token: string | undefined | null): string | null {
  if (!token) return null
  try {
    const payload = jwt.verify(token, getSecret()) as { sub?: string }
    return payload?.sub ?? null
  } catch {
    return null
  }
}

/**
 * Read the current user id from:
 *  - next/headers cookies()   (when called in server components/route handlers)
 *  - or a plain Headers object (when called with req.headers)
 */
export function getUserIdFromCookie(
  source?: ReadonlyRequestCookies | Headers | null
): string | null {
  try {
    // Case 1: source not provided → use cookies() API
    if (!source) {
      const token = cookies().get(COOKIE_NAME)?.value
      return verifySid(token)
    }

    // Case 2: Headers object
    if (typeof (source as Headers).get === 'function') {
      const token = parseCookieHeader((source as Headers).get('cookie'))[COOKIE_NAME]
      return verifySid(token)
    }

    // Case 3: Next's RequestCookies
    const token = (source as ReadonlyRequestCookies).get(COOKIE_NAME)?.value
    return verifySid(token)
  } catch {
    return null
  }
}

// Attach the auth cookie to a JSON response (helper)
export function jsonWithAuthCookie<T extends object>(
  body: T,
  userId: string,
  init?: ResponseInit
) {
  const token = issueSid(userId)

  // Create a plain Response and set cookie header manually to keep it framework-agnostic
  const res = new Response(JSON.stringify(body), {
    ...(init || {}),
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(init?.headers || {}),
      // one Set-Cookie here; Vercel/Next will merge correctly
      'set-cookie': `${COOKIE_NAME}=${encodeURIComponent(
        token
      )}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE_SECONDS}; ${
        process.env.NODE_ENV === 'production' ? 'Secure; ' : ''
      }`,
    },
  })
  return res
}

// Clear the cookie (useful for /logout)
export function jsonClearAuthCookie<T extends object>(body: T, init?: ResponseInit) {
  const res = new Response(JSON.stringify(body), {
    ...(init || {}),
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(init?.headers || {}),
      'set-cookie': `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; ${
        process.env.NODE_ENV === 'production' ? 'Secure; ' : ''
      }`,
    },
  })
  return res
}