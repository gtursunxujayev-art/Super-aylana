import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { requireAdmin } from '../requireAdmin'
import { z } from 'zod'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'   // ensure Node runtime for DELETE body/query parsing
export const revalidate = 0

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) return NextResponse.json({ ok: false }, { status: 401 })
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, username: true, balance: true, visible: true, createdAt: true, tgId: true },
  })
  return NextResponse.json(users)
}

const PatchBody = z.object({
  id: z.string(),
  username: z.string().optional(),
  visible: z.boolean().optional(),
  addCoins: z.number().optional(),
  removeCoins: z.number().optional(),
})

export async function PATCH(req: Request) {
  if (!(await requireAdmin(req))) return NextResponse.json({ ok: false }, { status: 401 })
  const b = PatchBody.parse(await req.json())

  if (b.username !== undefined || b.visible !== undefined) {
    await prisma.user.update({
      where: { id: b.id },
      data: {
        ...(b.username !== undefined ? { username: b.username } : {}),
        ...(b.visible !== undefined ? { visible: b.visible } : {}),
      },
    })
  }
  if (b.addCoins && b.addCoins !== 0) {
    await prisma.user.update({ where: { id: b.id }, data: { balance: { increment: b.addCoins } } })
    await prisma.balanceEvent.create({ data: { userId: b.id, delta: b.addCoins, reason: 'Admin grant' } })
  }
  if (b.removeCoins && b.removeCoins !== 0) {
    await prisma.user.update({ where: { id: b.id }, data: { balance: { decrement: b.removeCoins } } })
    await prisma.balanceEvent.create({ data: { userId: b.id, delta: -b.removeCoins, reason: 'Admin remove' } })
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  if (!(await requireAdmin(req))) return NextResponse.json({ ok: false }, { status: 401 })

  // accept id via query (?id=) or request body for robustness
  const url = new URL(req.url)
  const idFromQuery = url.searchParams.get('id')
  let id = idFromQuery
  if (!id) {
    try {
      const json = await req.json()
      id = json?.id
    } catch {
      /* no body */
    }
  }
  if (!id) return NextResponse.json({ ok: false, error: 'MISSING_ID' }, { status: 400 })

  // remove child rows first (in case of FK constraints)
  await prisma.win.deleteMany({ where: { userId: id } })
  await prisma.balanceEvent.deleteMany({ where: { userId: id } })
  await prisma.spin.deleteMany({ where: { userId: id } })

  await prisma.user.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
