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
  maxAge: 60 * 60 * 24 * 30,
}

export async function POST(req: Request) {
  const { username, password } = await req.json()

  if (!username || !password || password.length < 4) {
    return NextResponse.json({ ok: false, error: 'INVALID_INPUT' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { username } })
  if (existing) {
    return NextResponse.json({ ok: false, error: 'TAKEN' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { username, passwordHash, balance: 0 },
    select: { id: true },
  })

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
