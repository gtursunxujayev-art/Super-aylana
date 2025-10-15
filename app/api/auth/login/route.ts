import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'

const COOKIE_NAME = 'auth'
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret')
const COOKIE_BASE = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 24 * 30, // 30d
}

export async function POST(req: Request) {
  const { username, password } = await req.json()

  if (!username || !password) {
    return NextResponse.json({ ok: false, error: 'EMPTY' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { username } })
  if (!user || !user.passwordHash) {
    return NextResponse.json({ ok: false, error: 'INVALID' }, { status: 401 })
  }

  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) {
    return NextResponse.json({ ok: false, error: 'INVALID' }, { status: 401 })
  }

  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(JWT_SECRET)

  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_NAME, token, COOKIE_BASE)
  return res
}
