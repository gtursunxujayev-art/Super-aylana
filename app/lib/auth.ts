// app/lib/auth.ts
import jwt from 'jsonwebtoken'
import { NextResponse } from 'next/server'
import { cookies as nextCookies } from 'next/headers'
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'

/**
 * Cookie / JWT settings
 */
const COOKIE_NAME = 'sid'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 days

function ensureSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not set. Add JWT_SECRET in your env.')
  }
}

/**
 * Create a signed session token (JWT)
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
    secure: true,
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
    const value = (jar as any).get?.(COOKIE_NAME)?.value
    return value ?? null
  } catch {
    return null
  }
}

/**
 * Verify token and return payload { userId, isAdmin } (or null)
 */
export function readSession(
  c?: ReadonlyRequestCookies | ReturnType<typeof nextCookies>
): { userId: string; isAdmin?: boolean } | null {
  ensureSecret()
  const token = getTokenFromCookies(c)
  if (!token) return null
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as
      | { userId?: string; isAdmin?: boolean }
      | undefined
    if (!decoded?.userId) return null
    return { userId: decoded.userId, isAdmin: decoded.isAdmin }
  } catch {
    return null
  }
}

/**
 * Convenience: just the userId (or null)
 */
export function getUserIdFromCookie(
  c?: ReadonlyRequestCookies | ReturnType<typeof nextCookies>
): string | null {
  const s = readSession(c)
  return s?.userId ?? null
}

/**
 * Convenience: admin flag
 */
export function getIsAdminFromCookie(
  c?: ReadonlyRequestCookies | ReturnType<typeof nextCookies>
): boolean {
  const s = readSession(c)
  return Boolean(s?.isAdmin)
}

/**
 * Helper to require admin in API routes.
 * Throws Error('UNAUTHORIZED') if not admin.
 */
export function requireAdminFromCookies(
  c?: ReadonlyRequestCookies | ReturnType<typeof nextCookies>
) {
  const s = readSession(c)
  if (!s?.userId || !s.isAdmin) {
    throw new Error('UNAUTHORIZED')
  }
  return s
}

/* ------------------------------------------------------------------
 * Compatibility shims for your existing route imports
 * (so you don’t have to edit the routes right now)
 * ------------------------------------------------------------------*/

/**
 * Old name used in routes: issueSid → creates a JWT
 */
export const issueSid = signSession

/**
 * Old helper used in routes: jsonWithAuthCookie
 * - Sets/clears cookie based on provided token
 * - Returns NextResponse.json(data, init)
 */
export function jsonWithAuthCookie(
  data: any,
  options?: {
    token?: string | null // if provided and truthy → set cookie; if null → clear
    status?: number
    headers?: HeadersInit
  }
) {
  const res = NextResponse.json(data, {
    status: options?.status ?? 200,
    headers: options?.headers,
  })

  const c = nextCookies()

  if (options && 'token' in options) {
    if (options.token) {
      c.set(COOKIE_NAME, options.token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: true,
        path: '/',
        maxAge: MAX_AGE_SECONDS,
      })
    } else {
      c.delete(COOKIE_NAME)
    }
  }

  return res
}