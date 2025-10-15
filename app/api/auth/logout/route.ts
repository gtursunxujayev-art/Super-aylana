import { jsonWithAuthCookie } from '@/app/lib/auth'

export async function POST() {
  // token: '' clears the cookie
  return jsonWithAuthCookie({ ok: true }, { token: '' })
}