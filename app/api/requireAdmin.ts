import { cookies } from 'next/headers'
import { prisma } from '@/app/lib/prisma'
import { getUserIdFromCookie } from '@/app/lib/auth'

// Prisma requires the Node runtime in app routes/helpers that touch the DB
export const runtime = 'nodejs'

/**
 * Ensures the current request is authenticated as an admin.
 * - Reads the session from Next.js cookies()
 * - Throws 'UNAUTHORIZED' if no session
 * - Throws 'FORBIDDEN' if the user is not admin
 * - Returns the admin user's id on success
 */
export async function requireAdmin(): Promise<string> {
  // ✅ Pass cookies(), not headers()
  const uid = await getUserIdFromCookie(cookies())
  if (!uid) {
    throw new Error('UNAUTHORIZED')
  }

  const me = await prisma.user.findUnique({
    where: { id: uid },
    select: { id: true, isAdmin: true },
  })

  if (!me?.isAdmin) {
    throw new Error('FORBIDDEN')
  }

  return me.id
}