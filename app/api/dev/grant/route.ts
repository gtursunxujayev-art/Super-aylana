import { NextResponse } from 'next/server'
import { getUserIdFromCookie } from '@/app/lib/auth'
import { prisma } from '@/app/lib/prisma'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  // Check authentication
  const uid = await getUserIdFromCookie(cookies())
  if (!uid) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { coins } = await req.json().catch(() => ({ coins: 50 }))
  const user = await prisma.user.update({
    where: { id: uid },
    data: { balance: { increment: coins } },
  })

  return NextResponse.json({ ok: true, balance: user.balance })
}