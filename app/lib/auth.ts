import { cookies as nextCookies, type ReadonlyRequestCookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { SignJWT, jwtVerify } from 'jose'

export const SID_COOKIE = 'sid'
const ALG = 'HS256'
const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 days

function getKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 32) {
    throw new Error(
      'AUTH_SECRET is missing/short. Set a long random string in .env/Vercel → Environment Variables.'
    )
  }
  return new TextEncoder().encode(secret)
}

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

export async function verifySid(token?: string | null): Promise<{ userId: string } | null> {
  if (!token) return null
  try {
    const key = getKey()
    const { payload } = await jwtVerify(token, key, { algorithms: [ALG] })
    const uid = (payload as any).uid
    return typeof uid === 'string' && uid ? { userId: uid } : null
  } catch {
    return null
  }
}

export async function getUserIdFromCookie(
  cookieStore?: ReadonlyRequestCookies
): Promise<string | null> {
  const store = cookieStore ?? safeCookies()
  const token = store?.get(SID_COOKIE)?.value
  const res = await verifySid(token)
  return res?.userId ?? null
}

// legacy helper some files might still import
export async function getUserFromCookie(
  cookieStore?: ReadonlyRequestCookies
): Promise<{ id: string } | null> {
  const uid = await getUserIdFromCookie(cookieStore)
  return uid ? { id: uid } : null
}

export function setAuthCookie(res: NextResponse, token: string, maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS) {
  res.cookies.set(SID_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSeconds,
  })
}

export function clearAuthCookie(res: NextResponse) {
  res.cookies.set(SID_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
}

export function jsonWithAuthCookie(data: any, options?: { status?: number; token?: string | null }) {
  const res = NextResponse.json(data, { status: options?.status ?? 200 })
  if (typeof options?.token === 'string') {
    if (options.token.length === 0) clearAuthCookie(res)
    else setAuthCookie(res, options.token)
  }
  return res
}

function safeCookies(): ReadonlyRequestCookies | null {
  try {
    return nextCookies()
  } catch {
    return null
  }
