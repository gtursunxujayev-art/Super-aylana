// app/api/auth/login/route.ts
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/app/lib/prisma'
import { issueSid, jsonWithAuthCookie } from '@/app/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const { username, password } = await req.json().catch(() => ({} as any))

  if (!username || !password) {
    return NextResponse.json(
      { ok: false, error: 'Username va parol talab qilinadi.' },
      { status: 400 }
    )
  }

  const user = await prisma.user.findUnique({
    where: { username: String(username) },
  })

  if (!user || !user.passwordHash) {
    return NextResponse.json(
      { ok: false, error: 'Foydalanuvchi topilmadi yoki noto‘g‘ri ma’lumot.' },
      { status: 401 }
    )
  }

  const valid = await bcrypt.compare(String(password), user.passwordHash)
  if (!valid) {
    return NextResponse.json(
      { ok: false, error: 'Noto‘g‘ri parol.' },
      { status: 401 }
    )
  }

  const token = issueSid({ uid: user.id })

  return jsonWithAuthCookie(
    { ok: true, user: { id: user.id, username: user.username } },
    { token } // pass as object
  )
}