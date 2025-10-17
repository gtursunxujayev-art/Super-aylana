// app/api/auth/register/route.ts
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

  const existing = await prisma.user.findUnique({
    where: { username: String(username) },
  })
  if (existing) {
    return NextResponse.json(
      { ok: false, error: 'Bu username band.' },
      { status: 409 }
    )
  }

  const passwordHash = await bcrypt.hash(String(password), 10)

  const user = await prisma.user.create({
    data: {
      username: String(username),
      passwordHash,
    },
  })

  // ✅ Pass plain string ID
  const token = issueSid(user.id)

  return jsonWithAuthCookie(
    { ok: true, user: { id: user.id, username: user.username } },
    { token }
  )
}