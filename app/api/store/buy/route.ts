import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { getUserIdFromCookie } from '../../../lib/auth'
import { tgSendMessage } from '../../../lib/telegram'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: Request) {
  const uid = await getUserIdFromCookie(req.headers)
  if (!uid) return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 })

  const { prizeId } = await req.json().catch(() => ({} as { prizeId?: string }))
  if (!prizeId) return NextResponse.json({ ok: false, error: 'NO_PRIZE' }, { status: 400 })

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: uid } })
    if (!user) return NextResponse.json({ ok: false, error: 'NOUSER' }, { status: 400 })

    const prize = await tx.prize.findUnique({ where: { id: prizeId } })
    if (!prize || !prize.active) return NextResponse.json({ ok: false, error: 'PRIZE_INACTIVE' }, { status: 400 })
    if (user.balance < prize.coinCost) return NextResponse.json({ ok: false, error: 'NOT_ENOUGH_COINS' }, { status: 402 })

    await tx.user.update({ where: { id: uid }, data: { balance: { decrement: prize.coinCost } } })
    await tx.balanceEvent.create({ data: { userId: uid, delta: -prize.coinCost, reason: `Buy: ${prize.title}` } })
    await tx.win.create({ data: { userId: uid, prizeId: prize.id, title: prize.title, imageUrl: prize.imageUrl ?? null } })

    // Telegram notify (best effort)
    if (user.tgId) tgSendMessage(user.tgId, `🛒 <b>${user.username}</b>, do‘kondan "${prize.title}" ni ${prize.coinCost} tangaga oldingiz.`)

    return NextResponse.json({ ok: true, title: prize.title, cost: prize.coinCost })
  })
}
