import { NextResponse } from 'next/server'
import { prisma } from '../../lib/prisma'
import { z } from 'zod'
import { issueSid } from '../../lib/auth'

const Body = z.object({
  tgId: z.string(),
  username: z.string().min(1),
  visible: z.boolean().optional(),
})

export async function POST(req: Request) {
  const body = await req.json()
  const { tgId, username, visible } = Body.parse(body)

  const user = await prisma.user.upsert({
    where: { tgId },
    create: { tgId, username, visible: visible ?? true },
    update: { username, ...(visible === undefined ? {} : { visible }) },
  })

  const token = await issueSid(user.id)

  const res = NextResponse.json({ ok: true, user })
  res.cookies.set('sid', token, { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30, path: '/' })
  return res
}