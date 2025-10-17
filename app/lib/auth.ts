// app/lib/auth.ts
import jwt from 'jsonwebtoken'
import { cookies as nextCookies } from 'next/headers'
import { NextResponse } from 'next/server'

const COOKIE_NAME = 'sid'
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'

// Create a short, signed session token for a user id
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

// Attach/clear the auth cookie and return JSON
export function jsonWithAuthCookie<T extends object>(
  body: T,
  opts: { token?: string; maxAgeDays?: number } = {}
) {
  const res = NextResponse.json(body)

  // If token is an empty string -> clear cookie
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

  // If token provided -> set/update cookie
  if (typeof opts.token === 'string') {
    const maxAge =
      (opts.maxAgeDays ?? 7) * 24 * 60 * 60 // seconds
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

// Read current session in server context
export async function readSession(): Promise<{ userId: string | null }> {
  const token = nextCookies().get(COOKIE_NAME)?.value
  if (!token) return { userId: null }
  const payload = verifySid(token)
  return { userId: payload?.uid ?? null }
}