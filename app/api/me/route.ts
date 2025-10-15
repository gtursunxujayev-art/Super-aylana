import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { cookies } from 'next/headers'
import { getUserIdFromCookie } from '@/app/lib/auth'

export async function GET() {
  const userId = await getUserIdFromCookie(cookies())
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 })

  const me = await prisma.user.findUnique({ where: { id: userId } })
  if (!me) return NextResponse.json({ ok: false }, { status: 404 })

  return NextResponse.json({ ok: true, me: { id: me.id, username: me.username, isAdmin: me.isAdmin, balance: me.balance } })
}