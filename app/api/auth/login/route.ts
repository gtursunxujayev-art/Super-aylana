import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import bcrypt from 'bcryptjs'
import { issueSid, jsonWithAuthCookie } from '@/app/lib/auth'

export async function POST(req: Request) {
  const { username, password } = await req.json().catch(() => ({} as any))

  if (!username || !password) {
    return NextResponse.json(
      { ok: false, error: 'Foydalanuvchi nomi yoki parol kiritilmagan.' },
      { status: 400 }
    )
  }

  const user = await prisma.user.findUnique({ where: { username } })
  if (!user || !user.passwordHash) {
    return NextResponse.json(
      { ok: false, error: 'Bunday foydalanuvchi topilmadi.' },
      { status: 404 }
    )
  }

  // ✅ Your schema uses passwordHash (not password)
  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    return NextResponse.json(
      { ok: false, error: 'Noto‘g‘ri parol.' },
      { status: 401 }
    )
  }

  const token = issueSid(user.id)
  return jsonWithAuthCookie(
  { ok: true, user: { id: user.id, username: user.username } },
  { token }          // ✅ pass as object, not raw string
)