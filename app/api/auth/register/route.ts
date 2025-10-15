import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  const { username, password } = await req.json()

  if (!username || !password) {
    return NextResponse.json({ ok: false, error: 'REQUIRED' }, { status: 400 })
  }

  const exists = await prisma.user.findFirst({ where: { username } })
  if (exists) {
    return NextResponse.json({ ok: false, error: 'TAKEN' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  await prisma.user.create({
    data: { username, passwordHash, isAdmin: false },
  })

  return NextResponse.json({ ok: true })
}