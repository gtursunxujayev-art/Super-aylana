// app/api/requireAdmin.ts
import { prisma } from '@/app/lib/prisma'
import { readSession } from '@/app/lib/auth'

export async function requireAdmin() {
  const { userId } = await readSession()
  if (!userId) throw new Error('UNAUTHORIZED')

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isAdmin: true, username: true },
  })
  if (!me?.isAdmin) throw new Error('FORBIDDEN')

  return me
}