import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import bcrypt from 'bcryptjs'
import { issueSid, jsonWithAuthCookie } from '@/app/lib/auth'

export async function POST(req: Request) {
  const { username, password } = await req.json().catch(() => ({}))

  if (!username || !password) {
    return NextResponse.json({ ok: false, error: 'Barcha maydonlarni to‘ldiring.' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { username } })
  if (existing) {
    return NextResponse.json({ ok: false, error: 'Bu foydalanuvchi nomi band.' }, { status: 400 })
  }

  const hash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { username, password: hash, balance: 0, isAdmin: false },
  })

  const token = issueSid(user.id)
  return jsonWithAuthCookie({ ok: true, user: { id: user.id, username: user.username } }, token)
}