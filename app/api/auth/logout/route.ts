import { jsonWithAuthCookie } from '@/app/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST() {
  // Clear the cookie by sending an empty token and 0-day maxAge
  return jsonWithAuthCookie(
    { ok: true },
    { token: '', maxAgeDays: 0 }
  )
}