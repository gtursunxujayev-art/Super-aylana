import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'   // ⬅️ ../../../lib/prisma

function auth(req: Request) {
  const k = req.headers.get('x-admin-key')
  if (k !== process.env.ADMIN_API_KEY) throw new Error('forbidden')
}

export async function GET(req: Request) {
  try {
    auth(req)
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } })
    return NextResponse.json(users)
  } catch {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }
}

export async function PATCH(req: Request) {
  try {
    auth(req)
    const body = await req.json() as {
      id: string; username?: string; visible?: boolean; addCoins?: number; removeCoins?: number
    }
    const updates: any = {}
    if (body.username !== undefined) updates.username = body.username
    if (body.visible !== undefined) updates.visible = body.visible
    let delta = 0
    if (body.addCoins) delta += body.addCoins
    if (body.removeCoins) delta -= body.removeCoins

    const user = await prisma.user.update({
      where: { id: body.id },
      data: { ...updates, ...(delta ? { balance: { increment: delta } } : {}) },
    })
    if (delta)
      await prisma.balanceEvent.create({ data: { userId: user.id, delta, reason: 'Admin adjust' } })

    return NextResponse.json(user)
  } catch {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }
}