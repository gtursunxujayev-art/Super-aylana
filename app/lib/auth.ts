// app/lib/auth.ts
import jwt from 'jsonwebtoken'
import { cookies as nextCookies, type ReadonlyRequestCookies } from 'next/headers'

/**
 * Minimal JWT-based cookie auth used by API routes.
 * Make sure you set process.env.JWT_SECRET
 */

export const AUTH_COOKIE = 'sid'
const DEFAULT_TTL = '30d'

function getSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    // In build/runtime without secret, throw a clear error
    throw new Error('JWT_SECRET is not set')
  }
  return secret
}

type SidPayload = {
  uid: string
  // you can add roles, etc., as needed
}

/**
 * Create a signed session token for a user id.
 */
export function issueSid(userId: string, ttl: string = DEFAULT_TTL): string {
  const token = jwt.sign({ uid: userId } as SidPayload, getSecret(), {
    algorithm: 'HS256',
    expiresIn: ttl,
  })
  return token
}

/**
 * Verify a token string and return the payload (or null if invalid/expired).
 */
export function verifySid(token: string | undefined | null): SidPayload | null {
  if (!token) return null
  try {
    const decoded = jwt.verify(token, getSecret(), { algorithms: ['HS256'] })
    // typesafe narrow
    if (typeof decoded === 'object' && decoded && 'uid' in decoded) {
      return decoded as SidPayload
    }
    return null
  }