import { NextResponse } from 'next/server'
import { prisma } from '../../lib/prisma'
import { z } from 'zod'
import { issueSid } from '../../lib/auth'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const Body = z.object({
  initData: z.string(), // Telegram WebApp initData
})

function verifyTelegramInitData(initData: string, botToken?: string) {
  if (!botToken) return null
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) return null

  const entries: string[] = []
  for (const [k, v] of Array.from(params.entries()).filter(([k]) => k !== 'hash').sort(([a], [b]) => a.localeCompare(b))) {
    entries.push(`${k}=${v}`)
  }
  const dataCheckString = entries.join('\n')

  const secret1 = crypto.createHash('sha256').update(botToken).digest()
  const check1 = crypto.createHmac('sha256', secret1).update(dataCheckString).digest('hex')

  const secret2 = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest()
  const check2 = crypto.createHmac('sha256', secret2).update(dataCheckString).digest('hex')

  if (hash !== check1 && hash !== check2) return null

  const userJson = params.get('user')
  if (!userJson) return null
  try { return JSON.parse(userJson) as { id: number; username?: string; first_name?: string; last_name?: string } }
  catch { return null }
}

export async function POST(req: Request) {
  const { initData } = Body.parse(await req.json())
  const tgUser = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN)
  if (!tgUser) return NextResponse.json({ ok: false, error: 'BAD_INITDATA' }, { status: 401 })

  const username = tgUser.username || `${tgUser.first_name || 'User'} ${tgUser.last_name || ''}`.trim() || `tg_${tgUser.id}`

  let tempPassword: string | null = null

  const existing = await prisma.user.findUnique({ where: { tgId: String(tgUser.id) } })
  if (!existing) {
    tempPassword = Math.random().toString(36).slice(-10)
    const passwordHash = await bcrypt.hash(tempPassword, 10)
    await prisma.user.create({
      data: { tgId: String(tgUser.id), username, passwordHash, visible: true },
    })
  } else {
    if (existing.username !== username) {
      await prisma.user.update({ where: { id: existing.id }, data: { username } })
    }
    if (!existing.passwordHash) {
      tempPassword = Math.random().toString(36).slice(-10)
      const passwordHash = await bcrypt.hash(tempPassword, 10)
      await prisma.user.update({ where: { id: existing.id }, data: { passwordHash } })
    }
  }

  const user = await prisma.user.findUnique({ where: { tgId: String(tgUser.id) } })
  const token = await issueSid(user!.id)

  const res = NextResponse.json({ ok: true, user: { id: user!.id, username: user!.username }, tempPassword })
  res.cookies.set('sid', token, { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30, path: '/' })
  return res
}
