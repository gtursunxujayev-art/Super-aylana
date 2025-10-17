// app/api/auth/register/route.ts
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/app/lib/prisma'
import { issueSid, jsonWithAuthCookie } from '@/app/lib/auth'

export async function POST(req: Request) {
  const { username, password } = await req.json().catch(() => ({}))

  if (!username || !password) {
    return NextResponse.json(
      { ok: false, error: 'Foydalanuvchi nomi va parol talab qilinadi.' },
      { status: 400 }
    )
  }

  const exists = await prisma.user.findUnique({ where: { username } })
  if (exists) {
    return NextResponse.json(
      { ok: false, error: 'Bu foydalanuvchi nomi band.' },
      { status: 409 }
    )
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { username, passwordHash, balance: 0, isAdmin: false },
    select: { id: true, username: true },
  })

  const token = issueSid(user.id, 7)
  return jsonWithAuthCookie({ ok: true, user }, { token })
}