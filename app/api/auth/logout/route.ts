// app/api/auth/logout/route.ts
import { jsonWithAuthCookie } from '@/app/lib/auth'

export async function POST() {
  // Pass an empty string to clear the cookie (matches jsonWithAuthCookie signature)
  return jsonWithAuthCookie({ ok: true }, '')
}