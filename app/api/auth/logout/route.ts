import { jsonWithAuthCookie } from '@/app/lib/auth'

export async function POST() {
  // Passing '' clears the cookie
  return jsonWithAuthCookie({ ok: true }, '')
}