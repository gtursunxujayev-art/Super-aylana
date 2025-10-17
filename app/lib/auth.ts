// app/lib/auth.ts
import jwt from 'jsonwebtoken'
import { cookies as nextCookies } from 'next/headers'
import { NextResponse } from 'next/server'

const COOKIE_NAME = 'sid'
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'

// ---------------------------
// JWT helpers
// ---------------------------
export function issueSid(userId: string, maxAgeDays = 7): string {
  const exp = Math.floor(Date.now() / 1000) + maxAgeDays * 24 * 60 * 60
  return jwt.sign({ uid: userId, exp }, JWT_SECRET)
}

export function verifySid(token: string): { uid: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { uid: string }
  } catch {
    return null
  }
}

// ---------------------------
//
// Cookie + JSON helper
//
// Pass { token: '' } to clear cookie,
// pass { token } to set/update cookie,
// or omit to just return JSON.
//
// ---------------------------
export function jsonWithAuthCookie<T extends object>(
  body: T,
  opts: { token?: string; maxAgeDays?: number } = {}
) {
  const res = NextResponse.json(body)

  // clear
  if (opts.token === '') {
    res.cookies.set(COOKIE_NAME, '', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })
    return res
  }

  // set/update
  if (typeof opts.token === 'string') {
    const maxAge = (opts.maxAgeDays ?? 7) * 24 * 60 * 60
    res.cookies.set(COOKIE_NAME, opts.token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge,
    })
  }

  return res
}

// ---------------------------
// Session readers
// ---------------------------

// Simple “who am I” for server components and API routes that use cookies()
export async function readSession(): Promise<{ userId: string | null }> {
  const token = nextCookies().get(COOKIE_NAME)?.value
  if (!token) return { userId: null }
  const payload = verifySid(token)
  return { userId: payload?.uid ?? null }
}

// Compatibility helper used across your API routes.
// It accepts either:
//   • nothing (it will read nextCookies() itself)
//   • a Headers object (from Request.headers)
//   • a cookies() result (ReadonlyRequestCookies-like: has .get(name))
// Returns the user id from the signed cookie, or null.
export async function getUserIdFromCookie(
  source?: Headers | { get: (name: string) => any }
): Promise<string | null> {
  // Case A: no source passed -> use server cookies()
  if (!source) {
    const token = nextCookies().get(COOKIE_NAME)?.value
    if (!token) return null
    const payload = verifySid(token)
    return payload?.uid ?? null
  }

  // Case B: Headers instance (e.g., req.headers)
  if (typeof (source as any).get === 'function' && source instanceof Headers) {
    const raw = (source as Headers).get('cookie')
    if (!raw) return null
    const token = cookieHeaderToMap(raw).get(COOKIE_NAME) || null
    const payload = token ? verifySid(token) : null
    return payload?.uid ?? null
  }

  // Case C: cookies() result (has .get that returns { value } or string)
  if (typeof (source as any).get === 'function') {
    const entry = (source as any).get(COOKIE_NAME)
    const token = typeof entry === 'string' ? entry : entry?.value
    if (!token) return null
    const payload = verifySid(token)
    return payload?.uid ?? null
  }

  return null
}

// ---------------------------
// Internal: parse Cookie header
// ---------------------------
function cookieHeaderToMap(cookieHeader: string): Map<string, string> {
  const map = new Map<string, string>()
  if (!cookieHeader) return map
  for (const part of cookieHeader.split(';')) {
    const [k, ...rest] = part.trim().split('=')
    const v = rest.join('=')
    if (k) map.set(k, decodeURIComponent(v ?? ''))
  }
  return map
}