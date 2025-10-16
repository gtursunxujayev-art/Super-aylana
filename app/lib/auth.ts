// app/lib/auth.ts
import jwt from 'jsonwebtoken'
import { cookies as nextCookies } from 'next/headers'
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'

/**
 * Cookie / JWT settings
 */
const COOKIE_NAME = 'sid'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 days

function ensureSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error(
      'JWT_SECRET is not set. Add JWT_SECRET to your Vercel/ENV settings.'
    )
  }
}

/**
 * Create a signed session token
 */
export function signSession(payload: { userId: string; isAdmin?: boolean }) {
  ensureSecret()
  return jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: `${MAX_AGE_SECONDS}s`,
  })
}

/**
 * Set the auth cookie
 */
export function setLoginCookie(
  token: string,
  jar?: ReturnType<typeof nextCookies>
) {
  const c = jar ?? nextCookies()
  c.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true, // Vercel is HTTPS → safe
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  })
}

/**
 * Clear the auth cookie
 */
export function clearLoginCookie(jar?: ReturnType<typeof nextCookies>) {
  const c = jar ?? nextCookies()
  c.delete(COOKIE_NAME)
}

/**
 * Get raw JWT token string from cookies
 */
export function getTokenFromCookies(
  c?: ReadonlyRequestCookies | ReturnType<typeof nextCookies>
): string | null {
  try {
    const jar = c ?? nextCookies()
    // Both ReadonlyRequestCookies and ResponseCookies have get(name)?.value
    // We avoid strict typing gymnastics by using "as any" here.
    const value = (jar as any).get?.(COOKIE_NAME)?.value
    return value ?? null
  } catch {
    return null
  }
}

/**
 * Verify token and return userId (or null)
 */
export function getUserIdFromCookie(
  c?: ReadonlyRequestCookies | ReturnType<typeof nextCookies>
): string | null {
  ensureSecret()
  const token = getTokenFromCookies(c)
  if (!token) return null
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as
      | { userId?: string }
      | undefined
    return decoded?.userId ?? null
  } catch {
    return null
  }
}

/**
 * Optional: get admin flag from cookie
 */
export function getIsAdminFromCookie(
  c?: ReadonlyRequestCookies | ReturnType<typeof nextCookies>
): boolean {
  ensureSecret()
  const token = getTokenFromCookies(c)
  if (!token) return false
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as
      | { isAdmin?: boolean }
      | undefined
    return Boolean(decoded?.isAdmin)
  } catch {
    return false
  }
}

/**
 * Helper to require admin in API routes.
 * Throws Error('UNAUTHORIZED') if not admin.
 */
export function requireAdminFromCookies(
  c?: ReadonlyRequestCookies | ReturnType<typeof nextCookies>
) {
  const userId = getUserIdFromCookie(c)
  const isAdmin = getIsAdminFromCookie(c)
  if (!userId || !isAdmin) {
    throw new Error('UNAUTHORIZED')
  }
  return { userId, isAdmin }
}