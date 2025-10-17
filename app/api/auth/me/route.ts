import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { readSession } from '@/app/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const sess = await readSession()
  const uid = sess?.uid
  if (!uid) {
    return NextResponse.json({ ok: false, user: null })
  }

  const user = await prisma.user.findUnique({
    where: { id: uid },
    select: {
      id: true,
      username: true,
      balance: true,
      isAdmin: true,
    },
  })

  return NextResponse.json({ ok: true, user })
}