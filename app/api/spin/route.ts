import { NextResponse } from 'next/server'
import { prisma } from '../../lib/prisma'
import { getUserIdFromCookie } from '../../lib/auth'
import { z } from 'zod'
import { tgSendMessage } from '../../lib/telegram'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const Body = z.object({ tier: z.enum(['50', '100', '200']) })
type WheelItem = { key: string; title: string; weight: number; coinDelta?: number; prizeId?: string; imageUrl?: string }

function pickWeighted<T extends WheelItem>(arr: T[]): T {
  const total = arr.reduce((s, a) => s + a.weight, 0)
  let r = Math.random() * total
  for (const a of arr) { r -= a.weight; if (r <= 0) return a }
  return arr[arr.length - 1]
}

async function buildWheel(tier: number): Promise<WheelItem[]> {
  const sameTier = await prisma.prize.findMany({ where: { active: true, coinCost: tier } })
  const nextTier = tier === 50 ? 100 : tier === 100 ? 200 : 500
  const ntFromDb = await prisma.prize.findMany({ where: { active: true, coinCost: nextTier } })

  const hardWeight = nextTier === 500 ? 0.2 : 1 / 3
  const nextTierPrizes = (ntFromDb.length ? ntFromDb.sort(() => Math.random()-0.5).slice(0,2) : [])
    .map(p => ({ key: 'p:'+p.id, title: p.title, weight: hardWeight, prizeId: p.id, imageUrl: p.imageUrl || undefined }))

  const list: WheelItem[] = [
    { key: 'again', title: 'Another spin', weight: 1, coinDelta: 0 },
    { key: '+bonus', title: `+${tier === 50 ? 75 : tier === 100 ? 150 : 300} coins`, weight: 0.5, coinDelta: tier === 50 ? 75 : tier === 100 ? 150 : 300 },
    ...nextTierPrizes,
    ...sameTier.map(p => ({ key: 'p:'+p.id, title: p.title, weight: 1, prizeId: p.id, imageUrl: p.imageUrl || undefined })),
  ]
  return list
}

export async function POST(req: Request) {
  const uid = await getUserIdFromCookie(req.headers)
  if (!uid) return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 })

  const { tier } = Body.parse(await req.json())
  const price = Number(tier)

  return prisma.$transaction(async (tx) => {
    let state = await tx.spinState.findUnique({ where: { id: 'global' } })
    if (!state) state = await tx.spinState.create({ data: { id: 'global', status: 'IDLE' } })
    if (state.status === 'SPINNING') return NextResponse.json({ ok: false, error: 'BUSY' }, { status: 409 })

    const user = await tx.user.findUnique({ where: { id: uid } })
    if (!user) return NextResponse.json({ ok: false, error: 'NOUSER' }, { status: 400 })
    if (user.balance < price) return NextResponse.json({ ok: false, error: 'NOT_ENOUGH_COINS' }, { status: 402 })

    const durationMs = 4200
    await tx.user.update({ where: { id: uid }, data: { balance: { decrement: price } } })
    await tx.balanceEvent.create({ data: { userId: uid, delta: -price, reason: `Spin ${price}` } })
    await tx.spinState.update({ where: { id: 'global' }, data: { status: 'SPINNING', spinStartAt: new Date(), durationMs, tier: price, userName: user.username, resultTitle: null } })

    const wheel = await buildWheel(price)
    const result = pickWeighted(wheel)
    const resultTitle = result.title

    if (result.coinDelta && result.coinDelta > 0) {
      await tx.user.update({ where: { id: uid }, data: { balance: { increment: result.coinDelta } } })
      await tx.balanceEvent.create({ data: { userId: uid, delta: result.coinDelta, reason: `Spin reward` } })
    }
    if (result.prizeId) {
      const prize = await tx.prize.findUnique({ where: { id: result.prizeId } })
      await tx.win.create({ data: { userId: uid, prizeId: result.prizeId, title: prize?.title ?? result.title, imageUrl: prize?.imageUrl ?? null } })
    } else {
      await tx.win.create({ data: { userId: uid, title: result.title, imageUrl: result.imageUrl ?? null } })
    }

    await tx.spin.create({ data: { userId: uid, tier: price, durationMs, result: resultTitle, completed: true } })
    await tx.spinState.update({ where: { id: 'global' }, data: { status: 'IDLE', resultTitle, spinStartAt: null, durationMs: null, tier: null } })

    // --- Telegram notify (best effort) ---
    if (user.tgId) {
      tgSendMessage(user.tgId, `🎉 <b>${user.username}</b>, siz "${resultTitle}" yutdingiz!`)
    }

    return NextResponse.json({ ok: true, durationMs, result: { title: resultTitle, coinDelta: result.coinDelta ?? 0 } })
  })
}
