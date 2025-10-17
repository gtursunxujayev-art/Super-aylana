// app/api/auth/logout/route.ts
import { jsonWithAuthCookie } from '@/app/lib/auth'

export async function POST() {
  // Clear cookie by setting empty token
  return jsonWithAuthCookie({ ok: true }, { token: '' })
}