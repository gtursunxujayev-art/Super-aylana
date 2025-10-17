import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import bcrypt from 'bcryptjs'
import { issueSid, jsonWithAuthCookie } from '@/app/lib/auth'

export async function POST(req: Request) {
  const { username, password } = await req.json().catch(() => ({} as any))

  if (!username || !password) {
    return NextResponse.json(
      { ok: false, error: 'Barcha maydonlarni to‘ldiring.' },
      { status: 400 }
    )
  }

  const existing = await prisma.user.findUnique({ where: { username } })
  if (existing) {
    return NextResponse.json(
      { ok: false, error: 'Bu foydalanuvchi nomi band.' },
      { status: 400 }
    )
  }

  const passwordHash = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: {
      username,
      passwordHash,          // ✅ store hashed password
      balance: 0,
      isAdmin: false,
      visible: true,
      tgId: '',              // if your schema requires it; adjust if optional
    },
  })

  const token = issueSid(user.id)
  return jsonWithAuthCookie(
  { ok: true, user: { id: user.id, username: user.username } },
  { token }
)