// app/api/state/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  // Fetch global spin state + last win (with user + prize for UI)
  const [state, last] = await Promise.all([
    prisma.spinState.findUnique({ where: { id: 'global' } }),
    prisma.win.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { username: true } },
        prize: { select: { title: true, imageUrl: true } },
      },
    }),
  ])

  return NextResponse.json({
    ok: true,
    // What the UI needs to know right now
    spinning: state?.status === 'SPINNING',
    status: state?.status ?? 'IDLE',

    // Only expose fields that actually exist on SpinState
    spinStartAt: state?.spinStartAt ?? null,
    durationMs: state?.durationMs ?? null,
    tier: state?.tier ?? null,
    userName: state?.userName ?? null,
    resultTitle: state?.resultTitle ?? null,

    // Latest win snapshot (for “Last 5 winners” UI; you can extend this later)
    lastWin: last
      ? {
          id: last.id,
          username: last.user.username,
          title: last.title,
          prizeTitle: last.prize?.title ?? null,
          imageUrl: last.prize?.imageUrl ?? null,
          createdAt: last.createdAt,
        }
      : null,
  })
}
