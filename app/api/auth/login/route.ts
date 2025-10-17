// app/api/auth/login/route.ts
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/app/lib/prisma'
import { jsonWithAuthCookie } from '@/app/lib/auth'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { username, password } = (await req.json().catch(() => ({}))) as {
      username?: string
      password?: string
    }

    if (!username || !password) {
      return NextResponse.json({ ok: false, error: 'REQUIRED' }, { status: 400 })
    }

    // username must be unique in Prisma schema (unique index)
    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true, passwordHash: true },
    })

    if (!user?.passwordHash) {
      return NextResponse.json({ ok: false, error: 'INVALID' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ ok: false, error: 'INVALID' }, { status: 401 })
    }

    // Set signed session cookie
    return jsonWithAuthCookie({ ok: true }, user.id)
  } catch (err) {
    console.error('POST /api/auth/login error:', err)
    return NextResponse.json({ ok: false, error: 'INTERNAL' }, { status: 500 })
  }
}