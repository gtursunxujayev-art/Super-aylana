import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/app/lib/prisma'
import { getUserIdFromCookie } from '@/app/lib/auth'

export const runtime = 'nodejs' // Prisma requires Node runtime

export async function POST(req: NextRequest) {
  try {
    // ✅ Use cookies() instead of req.headers
    const uid = await getUserIdFromCookie(cookies())
    if (!uid) {
      return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 })
    }

    const { prizeId } = await req.json().catch(() => ({ prizeId: undefined as string | undefined }))
    if (!prizeId || typeof prizeId !== 'string') {
      return NextResponse.json({ ok: false, error: 'BAD_REQUEST' }, { status: 400 })
    }

    // Load prize and validate it’s purchasable
    const prize = await prisma.prize.findUnique({
      where: { id: prizeId },
      select: { id: true, title: true, coinCost: true, active: true, showInStore: true },
    })
    if (!prize) {
      return NextResponse.json({ ok: false, error: 'PRIZE_NOT_FOUND' }, { status: 404 })
    }
    if (!prize.active || !prize.showInStore) {
      return NextResponse.json({ ok: false, error: 'PRIZE_NOT_FOR_SALE' }, { status: 400 })
    }
    const cost = Number(prize.coinCost ?? 0)
    if (!Number.isFinite(cost) || cost <= 0) {
      return NextResponse.json({ ok: false, error: 'INVALID_COST' }, { status: 400 })
    }

    // Atomically verify balance and deduct
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: uid },
        select: { id: true, balance: true },
      })
      if (!user) throw new Error('USER_NOT_FOUND')
      const current = Number(user.balance ?? 0)
      if (current < cost) throw new Error('NO_COINS')

      const updated = await tx.user.update({
        where: { id: uid },
        data: { balance: { decrement: cost } },
        select: { id: true, balance: true },
      })

      // Keep it minimal to avoid schema mismatches.
      // If you have a purchases table, you can insert there here later.

      return updated
    })

    return NextResponse.json({
      ok: true,
      prize: { id: prize.id, title: prize.title, cost },
      newBalance: Number(result.balance ?? 0),
      message: 'Item purchased successfully.',
    })
  } catch (err: any) {
    const code = String(err?.message || '')
    if (code === 'USER_NOT_FOUND') {
      return NextResponse.json({ ok: false, error: 'USER_NOT_FOUND' }, { status: 404 })
    }
    if (code === 'NO_COINS') {
      return NextResponse.json({ ok: false, error: 'NO_COINS' }, { status: 400 })
    }
    console.error('BUY route error:', err)
    return NextResponse.json({ ok: false, error: 'SERVER_ERROR' }, { status: 500 })
  }
}