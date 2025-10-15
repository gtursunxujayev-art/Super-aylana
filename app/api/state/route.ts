// app/api/state/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [state, last] = await Promise.all([
    prisma.spinState.findUnique({ where: { id: 'global' } }),
    prisma.win.findFirst({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { username: true } } },
    }),
  ])

  // Always return a stable payload so the client can't crash
  return NextResponse.json({
    ok: true,
    spinning: state?.status === 'SPINNING' ?? false,
    byUserId: (state as any)?.byUserId ?? null,         // optional — may be null
    userName: state?.userName ?? '',                    // required in schema; empty is fine for idle
    resultTitle: state?.resultTitle ?? '',
    tier: (state as any)?.tier ?? null,
    spinStartAt: state?.spinStartAt ?? null,
    durationMs: (state as any)?.durationMs ?? null,
    updatedAt: state?.updatedAt ?? null,
    lastWin: last
      ? {
          id: last.id,
          username: last.user?.username ?? '—',
          title: last.title,
          createdAt: last.createdAt,
        }
      : null,
  })
}
