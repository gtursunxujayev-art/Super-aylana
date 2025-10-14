import { NextResponse } from 'next/server'
import { prisma } from '../../lib/prisma'            // ⬅️ relative import
import { SignJWT, jwtVerify } from 'jose'
import { z } from 'zod'

const secret = new TextEncoder().encode(process.env.ADMIN_API_KEY || 'dev-key')

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

  const token = await new SignJWT({ uid: user.id })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(secret)

  const res = NextResponse.json({ ok: true, user })
  res.cookies.set('sid', token, { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 })
  return res
}

// helper used by other APIs (keep export)
export async function getUserIdFromCookie(headers: Headers): Promise<string | null> {
  const rawCookie = headers.get('cookie') || ''
  const m = rawCookie.match(/(?:^|;\s*)sid=([^;]+)/)
  const sid = m?.[1]
  if (!sid) return null
  try {
    const { payload } = await jwtVerify(sid, secret)
    return (payload as any).uid as string
  } catch {
    return null
  }
}