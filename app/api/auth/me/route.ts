// app/api/auth/me/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { readSession } from '@/app/lib/auth'

export async function GET() {
  const session = await readSession()
  if (!session) {
    return NextResponse.json({ ok: true, user: null })
  }

  const me = await prisma.user.findUnique({
    where: { id: session.uid },
    select: { id: true, username: true, balance: true, isAdmin: true },
  })

  return NextResponse.json({ ok: true, user: me })
}