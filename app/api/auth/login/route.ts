import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import bcrypt from 'bcryptjs'
import { issueSid, jsonWithAuthCookie } from '@/app/lib/auth'

export async function POST(req: Request) {
  const { username, password } = await req.json().catch(() => ({}))

  if (!username || !password) {
    return NextResponse.json({ ok: false, error: 'Foydalanuvchi nomi yoki parol kiritilmagan.' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { username } })
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Bunday foydalanuvchi topilmadi.' }, { status: 404 })
  }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    return NextResponse.json({ ok: false, error: 'Noto‘g‘ri parol.' }, { status: 401 })
  }

  const token = issueSid(user.id)
  // ✅ Important: sameSite must be 'none' for Vercel HTTPS
  return jsonWithAuthCookie({ ok: true, user: { id: user.id, username: user.username } }, token)
}