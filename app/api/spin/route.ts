// app/api/spin/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
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

    // Who is spinning?
    const userId = await getUserIdFromCookie(cookies())
    if (!userId) return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 })

    const result = await prisma.$transaction(async (tx) => {
      // Check lock
      const state = await tx.spinState.findUnique({ where: { id: 'global' } })
      if (state?.status === 'SPINNING') throw new Error('BUSY')

      // Lock the wheel (NOTE: only the `status` field is used)
      await tx.spinState.update({
        where: { id: 'global' },
        data: { status: 'SPINNING' },
      })

      // Check balance
      const me = await tx.user.findUniqueOrThrow({ where: { id: userId } })
      if (me.balance < tier) throw new Error('NO_COINS')

      // Charge the spin
      await tx.user.update({
        where: { id: userId },
        data: { balance: { decrement: tier } },
      })

      // Build candidate prizes = all ACTIVE prizes for this tier
      const prizes = await tx.prize.findMany({
        where: { coinCost: tier, active: true },
        orderBy: [{ title: 'asc' }],
      })

      // Basic pick: choose uniformly among active prizes for the tier.
      // (Your weighted logic / “another spin” / bonus coins can be put here later.)
      let prizeId: string | null = null
      let title = 'Another spin'
      let imageUrl: string | null = null
      let coinDelta = 0

      if (prizes.length > 0) {
        const pick = prizes[Math.floor(Math.random() * prizes.length)]
        prizeId = pick.id
        title = pick.title
        imageUrl = pick.imageUrl ?? null
      }

      // Record win
      const win = await tx.win.create({
        data: {
          userId,
          prizeId,
          title,
          coinDelta,
          tier,
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
        coinDelta,
        prizeId,
      }
    })

    // Return result to client
    return NextResponse.json({ ok: true, ...result })
  } catch (err: any) {
    // Make sure wheel is unlocked if a handled error occurred in the tx
    // (If the error was thrown before locking, this is a no-op)
    try {
      await prisma.spinState.update({
        where: { id: 'global' },
        data: { status: 'IDLE' },
      })
    } catch {}

    if (err.message === 'BUSY') {
      return NextResponse.json({ ok: false, error: 'BUSY' }, { status: 409 })
    }
    if (err.message === 'NO_COINS') {
      return NextResponse.json({ ok: false, error: 'NO_COINS' }, { status: 402 })
    }

    console.error('spin error:', err)
    return NextResponse.json({ ok: false, error: 'SERVER_ERROR' }, { status: 500 })
  }
}
