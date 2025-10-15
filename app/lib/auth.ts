// app/lib/auth.ts
import { jwtVerify } from 'jose'
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret')

// Accept both names so old & new code work.
const COOKIE_NAMES = ['auth', 'token'] as const

function readCookieFromHeadersLike(h: Headers | ReadonlyRequestCookies): string | null {
  // Headers (server) or RequestCookies (app router)
  for (const name of COOKIE_NAMES) {
    // @ts-expect-error unifying two types at runtime
    const v = typeof h.get === 'function' ? h.get('cookie') : h.get(name)
    if (typeof v === 'string') {
      // Headers path: parse "cookie" header
      if (v.includes('=')) {
        const m = v.match(new RegExp(`(?:^|; )${name}=([^;]+)`))
        if (m) return decodeURIComponent(m[1])
      } else {
        // RequestCookies path: h.get(name) already returns value
        return v
      }
    }
  }
  return null
}

export async function getUserIdFromCookie(headersOrCookies?: Headers | ReadonlyRequestCookies) {
  try {
    if (!headersOrCookies) return null
    const token = readCookieFromHeadersLike(headersOrCookies)
    if (!token) return null
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return (payload.sub as string) || null
  } catch {
    return null
  }
}
