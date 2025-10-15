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

  return NextResponse.json({
    ok: true,

    // FIX: produce a boolean without using ?? on a boolean expression
    spinning: !!(state && state.status === 'SPINNING'),

    // Optional fields with safe fallbacks
    byUserId: (state as any)?.byUserId ?? null,
    userName: state?.userName ?? '',
    resultTitle: state?.resultTitle ?? '',
    tier: (state as any)?.tier ?? null,
    spinStartAt: state?.spinStartAt ?? null,
    durationMs: (state as any)?.durationMs ?? null,
    updatedAt: state?.updatedAt ?? null,

    // Last win block (or null)
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
