// app/api/auth/login/route.ts
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

  const user = await prisma.user.findUnique({
    where: { username },
  })

  if (!user || !user.passwordHash) {
    return NextResponse.json(
      { ok: false, error: 'Foydalanuvchi topilmadi.' },
      { status: 401 }
    )
  }

  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) {
    return NextResponse.json(
      { ok: false, error: 'Noto‘g‘ri parol.' },
      { status: 401 }
    )
  }

  const token = issueSid(user.id, 7)
  return jsonWithAuthCookie(
    { ok: true, user: { id: user.id, username: user.username } },
    { token }
  )
}