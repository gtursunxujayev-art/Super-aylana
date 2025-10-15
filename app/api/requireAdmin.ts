// app/api/requireAdmin.ts
import { NextResponse } from 'next/server'
import { getUserFromCookie } from '@/app/lib/auth'

/**
 * Ensure the current request is from an admin.
 * Admins are determined by the allow-list in env ADMIN_USERNAMES
 * (comma-separated usernames, case sensitive).
 *
 * Example: ADMIN_USERNAMES="admin, Sabina"
 */
export async function requireAdmin() {
  const me = await getUserFromCookie()
  if (!me) {
    // In app router, throwing is fine – handler can let the build/runtime surface 401
    throw new Error('UNAUTHORIZED')
  }

  const allow = (process.env.ADMIN_USERNAMES || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  if (allow.length > 0 && !allow.includes(me.username)) {
    throw new Error('FORBIDDEN')
  }

  return me
}

/** Small helper if you want a Response directly (optional) */
export async function ensureAdminOrJson() {
  try {
    const me = await requireAdmin()
    return { me, error: null as null }
  } catch (e: any) {
    const code = e?.message === 'FORBIDDEN' ? 403 : 401
    return { me: null, error: NextResponse.json({ ok: false, error: e?.message || 'UNAUTHORIZED' }, { status: code }) }
  }
}
