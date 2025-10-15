// app/api/requireAdmin.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getUserIdFromCookie } from '@/app/lib/auth'
import { prisma } from '@/app/lib/prisma'

/**
 * Ensure the current request is from an admin.
 * Admins are determined by the allow-list env ADMIN_USERNAMES
 * (comma-separated usernames, case sensitive).
 * Example: ADMIN_USERNAMES="admin,Sabina"
 */
export async function requireAdmin() {
  // NOTE: getUserIdFromCookie expects cookies()
  const userId = await getUserIdFromCookie(cookies())
  if (!userId) throw new Error('UNAUTHORIZED')

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, balance: true }
  })
  if (!me) throw new Error('UNAUTHORIZED')

  const allow = (process.env.ADMIN_USERNAMES || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  if (allow.length > 0 && !allow.includes(me.username)) {
    throw new Error('FORBIDDEN')
  }
  return me
}

/** Optional helper that returns a JSON response on failure */
export async function ensureAdminOrJson() {
  try {
    const me = await requireAdmin()
    return { me, error: null as null }
  } catch (e: any) {
    const code = e?.message === 'FORBIDDEN' ? 403 : 401
    return {
      me: null,
      error: NextResponse.json({ ok: false, error: e?.message || 'UNAUTHORIZED' }, { status: code })
    }
  }
}
