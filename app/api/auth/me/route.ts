import { NextResponse } from 'next/server'
import { readSession } from '@/app/lib/auth'
import { prisma } from '@/app/lib/prisma'

export async function GET() {
  const { userId } = readSession()
  if (!userId) return NextResponse.json({ ok: false, user: null })

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, balance: true, isAdmin: true },
  })

  return NextResponse.json({ ok: true, user })
}