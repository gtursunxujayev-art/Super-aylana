// app/api/spin/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { getUserIdFromCookie } from '@/app/lib/auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const Body = z.object({
  tier: z.number().int().refine((v) => [50, 100, 200].includes(v), 'Tier must be 50, 100 or 200'),
})

export async function POST(req: Request) {
  try {
    const body = Body.parse(await req.json())
    const tier = body.tier

    // Identify user from request headers (NOT cookies())
    const userId = await getUserIdFromCookie(req.headers as Headers)
    if (!userId) {
      return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 })
    }

    const result = await prisma.$transaction(async (tx) => {
      // Check global lock
      const state = await tx.spinState.findUnique({ where: { id: 'global' } })
      if (state?.status === 'SPINNING') throw new Error('BUSY')

      // Lock
      await tx.spinState.update({
        where: { id: 'global' },
        data: { status: 'SPINNING' },
      })

      // Balance check
      const me = await tx.user.findUniqueOrThrow({ where: { id: userId } })
      if (me.balance < tier) throw new Error('NO_COINS')

      // Deduct spin cost
      await tx.user.update({
        where: { id: userId },
        data: { balance: { decrement: tier } },
      })

      // Candidates: active prizes for this tier
      const prizes = await tx.prize.findMany({
        where: { coinCost: tier, active: true },
        orderBy: [{ title: 'asc' }],
      })

      // Simple uniform pick among active items
      let prizeId: string | null = null
      let title = 'Another spin'
      let imageUrl: string | null = null

      if (prizes.length > 0) {
        const pick = prizes[Math.floor(Math.random() * prizes.length)]
        prizeId = pick.id
        title = pick.title
        imageUrl = pick.imageUrl ?? null
      }

      // Record win (NO `tier`, NO `coinDelta` — match your Prisma model)
      const win = await tx.win.create({
        data: {
          userId,
          prizeId,  // may be null
          title,
        },
      })

      // Unlock
      await tx.spinState.update({
        where: { id: 'global' },
        data: { status: 'IDLE' },
      })

      return {
        winId: win.id,
        title,
        imageUrl,
        prizeId,
      }
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (err: any) {
    // Best-effort unlock (safe even if not locked yet)
    try {
      await prisma.spinState.update({
        where: { id: 'global' },
        data: { status: 'IDLE' },
      })
    } catch {}

    if (err?.message === 'BUSY') {
      return NextResponse.json({ ok: false, error: 'BUSY' }, { status: 409 })
    }
    if (err?.message === 'NO_COINS') {
      return NextResponse.json({ ok: false, error: 'NO_COINS' }, { status: 402 })
    }

    console.error('spin error:', err)
    return NextResponse.json({ ok: false, error: 'SERVER_ERROR' }, { status: 500 })
  }
}
