import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import bcrypt from 'bcryptjs'
import { issueSid, jsonWithAuthCookie } from '@/app/lib/auth'

export async function POST(req: Request) {
  const { username, password } = await req.json()

  if (!username || !password) {
    return NextResponse.json({ ok: false, error: 'REQUIRED' }, { status: 400 })
  }

  const user = await prisma.user.findFirst({ where: { username } })
  if (!user || !user.passwordHash) {
    return NextResponse.json({ ok: false, error: 'INVALID' }, { status: 401 })
  }

  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) {
    return NextResponse.json({ ok: false, error: 'INVALID' }, { status: 401 })
  }

  const sid = await issueSid({ userId: user.id })
  return jsonWithAuthCookie({ ok: true }, { token: sid })
}