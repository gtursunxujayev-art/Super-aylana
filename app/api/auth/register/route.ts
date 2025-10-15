import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { issueSid } from '../../../lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const Body = z.object({
  username: z.string().min(3).max(32),
  password: z.string().min(6).max(64),
})

export async function POST(req: Request) {
  const { username, password } = Body.parse(await req.json())

  const exists = await prisma.user.findFirst({
    where: { username: { equals: username, mode: 'insensitive' } },
    select: { id: true },
  })
  if (exists) return NextResponse.json({ ok: false, error: 'USERNAME_TAKEN' }, { status: 409 })

  const hash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({ data: { username, passwordHash: hash, visible: true } })

  const sid = await issueSid(user.id)
  const res = NextResponse.json({ ok: true, user: { id: user.id, username: user.username } })
  res.cookies.set('sid', sid, { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30, path: '/' })
  return res
}
