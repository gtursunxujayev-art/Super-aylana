// app/api/state/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const [state, last5] = await Promise.all([
    prisma.spinState.findUnique({ where: { id: 'global' } }),
    prisma.win.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { username: true } },
        prize: { select: { title: true, imageUrl: true } },
      },
    }),
  ])

  return NextResponse.json({
    ok: true,
    spinning: state?.status === 'SPINNING',
    status: state?.status ?? 'IDLE',

    // existing columns…
    spinStartAt: state?.spinStartAt ?? null,
    durationMs: state?.durationMs ?? null,
    tier: state?.tier ?? null,
    userName: state?.userName ?? null,
    resultTitle: state?.resultTitle ?? null,

    // NEW: who is spinning (null if idle)
    byUserId: state?.byUserId ?? null,

    lastWins: last5.map((w) => ({
      id: w.id,
      username: w.user.username,
      title: w.title,
      prizeTitle: w.prize?.title ?? null,
      imageUrl: w.prize?.imageUrl ?? null,
      createdAt: w.createdAt,
    })),
  })
}
