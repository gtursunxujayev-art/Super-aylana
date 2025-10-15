// app/api/admin/users/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { requireAdmin } from '@/app/api/requireAdmin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  await requireAdmin()
  const users = await prisma.user.findMany({ orderBy: { username: 'asc' } })
  return NextResponse.json({ ok:true, users })
}

export async function POST(req: Request) {
  await requireAdmin()
  const body = await req.json()
  const { action, userId } = body

  if (action === 'grant') {
    const amount = Number(body.amount || 0)
    await prisma.user.update({ where:{ id:userId }, data:{ balance: { increment: amount } } })
    return NextResponse.json({ ok:true })
  }

  if (action === 'decrease') {
    const amount = Number(body.amount || 0)
    await prisma.user.update({ where:{ id:userId }, data:{ balance: { decrement: amount } } })
    return NextResponse.json({ ok:true })
  }

  if (action === 'rename') {
    const username = String(body.username || '').trim()
    if (!username) return NextResponse.json({ ok:false, error:'username required' }, { status:400 })
    await prisma.user.update({ where:{ id:userId }, data:{ username } })
    return NextResponse.json({ ok:true })
  }

  if (action === 'resetPassword') {
    const tempPassword = Math.random().toString(36).slice(2, 10)
    await prisma.user.update({ where:{ id:userId }, data:{ passwordHash: tempPassword } })
    return NextResponse.json({ ok:true, tempPassword })
  }

  if (action === 'delete') {
    await prisma.user.delete({ where:{ id:userId } })
    return NextResponse.json({ ok:true })
  }

  return NextResponse.json({ ok:false, error:'unknown action' }, { status:400 })
}
