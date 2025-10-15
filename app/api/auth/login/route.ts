import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { issueSid } from '../../../lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const Body = z.object({
  username: z.string().min(3).max(64),
  password: z.string().min(6).max(128),
})

export async function POST(req: Request) {
  const { username, password } = Body.parse(await req.json())

  const user = await prisma.user.findFirst({
    where: { username: { equals: username, mode: 'insensitive' } },
    select: { id: true, username: true, passwordHash: true },
  })
  if (!user || !user.passwordHash) return NextResponse.json({ ok: false, error: 'INVALID_CREDENTIALS' }, { status: 401 })

  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return NextResponse.json({ ok: false, error: 'INVALID_CREDENTIALS' }, { status: 401 })

  const sid = await issueSid(user.id)
  const res = NextResponse.json({ ok: true, user: { id: user.id, username: user.username } })
  res.cookies.set('sid', sid, { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30, path: '/' })
  return res
}
