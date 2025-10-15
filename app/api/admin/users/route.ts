import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { requireAdmin } from '../../requireAdmin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  await requireAdmin()
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, username: true, balance: true, tgId: true, createdAt: true }
  })
  return NextResponse.json({ ok: true, users })
}

const Body = z.union([
  z.object({ action: z.literal('grant'), userId: z.string(), amount: z.number().int() }),
  z.object({ action: z.literal('delete'), userId: z.string() }),
  z.object({ action: z.literal('resetPassword'), userId: z.string() }),
])

export async function POST(req: Request) {
  await requireAdmin()
  const body = Body.parse(await req.json())

  if (body.action === 'grant') {
    const { userId, amount } = body
    const u = await prisma.user.update({
      where: { id: userId },
      data: { balance: { increment: amount } }
    })
    await prisma.balanceEvent.create({ data: { userId, delta: amount, reason: 'ADMIN_GRANT' } })
    return NextResponse.json({ ok: true, user: { id: u.id, balance: u.balance } })
  }

  if (body.action === 'delete') {
    await prisma.user.delete({ where: { id: body.userId } })
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'resetPassword') {
    const temp = Math.random().toString(36).slice(-10)
    const hash = await bcrypt.hash(temp, 10)
    await prisma.user.update({ where: { id: body.userId }, data: { passwordHash: hash } })
    // Return the temp password ONCE so admin can share it
    return NextResponse.json({ ok: true, tempPassword: temp })
  }

  return NextResponse.json({ ok: false }, { status: 400 })
}
