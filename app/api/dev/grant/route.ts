import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { getUserIdFromCookie } from '../../../lib/auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: Request) {
  if (process.env.ALLOW_SELF_GRANT !== 'true') {
    return NextResponse.json({ ok: false, error: 'DISABLED' }, { status: 403 })
  }
  const uid = await getUserIdFromCookie(req.headers)
  if (!uid) return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 })

  const { coins } = await req.json().catch(() => ({ coins: 50 }))
  const delta = Number(coins || 50)

  const user = await prisma.user.update({
    where: { id: uid },
    data: { balance: { increment: delta } },
  })
  await prisma.balanceEvent.create({ data: { userId: uid, delta, reason: 'Dev grant' } })
  return NextResponse.json({ ok: true, balance: user.balance })
}