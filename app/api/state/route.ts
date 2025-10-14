import { NextResponse } from 'next/server'
import { prisma } from '../../lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const [state, users, store, wins] = await Promise.all([
    prisma.spinState.findUnique({ where: { id: 'global' } }),
    prisma.user.findMany({ where: { visible: true }, select: { id: true, username: true, balance: true } }),
    prisma.prize.findMany({ where: { active: true, showInStore: true }, orderBy: { coinCost: 'asc' } }),
    prisma.win.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { title: true, imageUrl: true, user: { select: { username: true } } },
    }),
  ])

  return NextResponse.json({
    state: state ?? { id: 'global', status: 'IDLE' },
    users,
    store,
    lastWins: wins.map(w => ({ user: w.user.username, title: w.title, imageUrl: w.imageUrl })),
  })
}