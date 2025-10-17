// app/api/auth/me/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { readSession } from '@/app/lib/auth'

export async function GET() {
  const { userId } = await readSession()
  if (!userId) return NextResponse.json({ ok: false, user: null })

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, balance: true, isAdmin: true },
  })

  return NextResponse.json({ ok: !!user, user })
}