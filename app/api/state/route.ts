// app/api/state/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const state = await prisma.spinState.findUnique({ where: { id: 'global' } })
  const last = await prisma.win.findFirst({
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { username: true } }, prize: { select: { imageUrl: true } } }
  })

  return NextResponse.json({
    ok: true,
    spinning: state?.status === 'SPINNING',
    byUserId: state?.byUserId ?? null,
    lastWin: last ? {
      id: last.id,
      username: last.user.username,
      title: last.title,
      imageUrl: last.prize?.imageUrl ?? null,
      at: last.createdAt
    } : null
  })
}
