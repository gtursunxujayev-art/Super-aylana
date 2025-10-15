// app/lib/auth.ts
import { cookies as nextCookies, type ReadonlyRequestCookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { SignJWT, jwtVerify } from 'jose'

/**
 * Token & cookie settings
 */
export const SID_COOKIE = 'sid'
const ALG = 'HS256'
const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 days

/**
 * Build a Uint8Array key for jose from AUTH_SECRET
 */
function getKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 32) {
    throw new Error(
      'AUTH_SECRET is missing or too short. Set a long random string in your env (Vercel: Project Settings → Environment Variables).'
    )
  }
  return new TextEncoder().encode(secret)
}

/**
 * Issue a signed session token (sid) carrying { userId }.
 * Keep payload tiny to ensure cookie stays small.
 */
export async function issueSid(
  payload: { userId: string },
  maxAgeSeconds: number = DEFAULT_MAX_AGE_SECONDS
): Promise<string> {
  const key = getKey()
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + maxAgeSeconds

  return await new SignJWT({ uid: payload.userId })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .sign(key)
}

/**
 * Verify a sid and return { userId } if valid, else null.
 */
export async function verifySid(token: string | undefined | null): Promise<{ userId: string } | null> {
  if (!token) return null
  try {
    const key = getKey()
    const { payload } = await jwtVerify(token, key, { algorithms: [ALG] })
    const uid = (payload as any).uid
    if (typeof uid !== 'string' || !uid) return null
    return { userId: uid }
  } catch {
    return null
  }
}

/**
 * Helper: read userId from a cookie store. Pass `cookies()` from a Route Handler,
 * or omit the argument to use the global cookies store in the same context.
 *
 * Example (in route.ts):
 *   import { cookies } from 'next/headers'
 *   const userId = await getUserIdFromCookie(cookies())
 */
export async function getUserIdFromCookie(
  cookieStore?: ReadonlyRequestCookies
): Promise<string | null> {
  // Prefer the passed-in store; fall back to global cookies() if available
  const store = cookieStore ?? safeCookies()
  const token = store?.get(SID_COOKIE)?.value
  const res = await verifySid(token)
  return res?.userId ?? null
}

/**
 * (Legacy compatibility) Some older code may import getUserFromCookie.
 * We return a tiny object with { id } if available, else null.
 */
export async function getUserFromCookie(
  cookieStore?: ReadonlyRequestCookies
): Promise<{ id: string } | null> {
  const uid = await getUserIdFromCookie(cookieStore)
  return uid ? { id: uid } : null
}

/**
 * Set the auth cookie on a NextResponse.
 */
export function setAuthCookie(
  res: NextResponse,
  token: string,
  maxAgeSeconds: number = DEFAULT_MAX_AGE_SECONDS
): void {
  res.cookies.set(SID_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSeconds,
  })
}

/**
 * Clear the auth cookie on a NextResponse.
 */
export function clearAuthCookie(res: NextResponse): void {
  res.cookies.set(SID_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
}

/**
 * Convenience helper to create a JSON response and set/clear the cookie.
 * - Pass a token to set it
 * - Pass token = '' to clear it
 * - Omit token to leave cookie untouched
 */
export function jsonWithAuthCookie(
  data: any,
  options?: { status?: number; token?: string | null }
): NextResponse {
  const res = NextResponse.json(data, { status: options?.status ?? 200 })
  if (typeof options?.token === 'string') {
    if (options.token.length === 0) clearAuthCookie(res)
    else setAuthCookie(res, options.token)
  }
  return res
}

/**
 * Try to access the global cookies() safely, in case we're not in a valid context.
 */
function safeCookies(): ReadonlyRequestCookies | null {
  try {
    return nextCookies()
  } catch {
    return null
  }
}