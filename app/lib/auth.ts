// app/lib/auth.ts
import jwt from 'jsonwebtoken'
import { cookies as nextCookies } from 'next/headers'
import { NextResponse } from 'next/server'

const COOKIE_NAME = 'sid'
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key'

// ----------------------------------------------------------
// TOKEN HELPERS
// ----------------------------------------------------------

export function issueSid(uid: string): string {
  return jwt.sign({ uid }, JWT_SECRET, { expiresIn: '7d' })
}

export function verifySid(token: string): { uid: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { uid: string }
  } catch {
    return null
  }
}

// ----------------------------------------------------------
// COOKIE HELPERS
// ----------------------------------------------------------

export function setAuthCookie(res: NextResponse, token: string, maxAgeDays = 7) {
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: maxAgeDays * 24 * 60 * 60,
    path: '/',
  })
}

export function clearAuthCookie(res: NextResponse) {
  res.cookies.delete(COOKIE_NAME)
}

// ----------------------------------------------------------
// JSON + COOKIE RESPONSE
// ----------------------------------------------------------

export function jsonWithAuthCookie(
  data: any,
  opts?: { token?: string; maxAgeDays?: number }
): NextResponse {
  const res = NextResponse.json(data)
  if (opts?.token) setAuthCookie(res, opts.token, opts.maxAgeDays)
  if (opts?.token === '') clearAuthCookie(res)
  return res
}

// ----------------------------------------------------------
// READ SESSION (For /api/auth/me etc.)
// ----------------------------------------------------------

export async function readSession() {
  const cookieStore = nextCookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return { userId: null }
  const payload = verifySid(token)
  return { userId: payload?.uid ?? null }
}

// ----------------------------------------------------------
// UNIVERSAL COOKIE READER (Headers or cookies())
// ----------------------------------------------------------

export async function getUserIdFromCookie(
  source?: Headers | ReturnType<typeof nextCookies>
): Promise<string | null> {
  if (!source) {
    const c = nextCookies().get(COOKIE_NAME)?.value
    if (!c) return null
    const payload = verifySid(c)
    return payload?.uid ?? null
  }

  // Case 1: next/headers cookies()
  if ('get' in source && !('append' in source)) {
    const token = source.get(COOKIE_NAME)?.value
    if (!token) return null
    const payload = verifySid(token)
    return payload?.uid ?? null
  }

  // Case 2: Headers from Request
  if (source instanceof Headers) {
    const raw = source.get('cookie')
    if (!raw) return null
    const cookies = Object.fromEntries(
      raw.split(';').map((c) => {
        const [k, v] = c.trim().split('=')
        return [k, decodeURIComponent(v || '')]
      })
    )
    const token = cookies[COOKIE_NAME]
    if (!token) return null
    const payload = verifySid(token)
    return payload?.uid ?? null
  }

  return null
}