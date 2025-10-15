import { NextResponse } from 'next/server'
import { prisma } from '../../lib/prisma'
import { z } from 'zod'
import { issueSid } from '../../lib/auth'
import crypto from 'crypto'

const Body = z.object({
  initData: z.string().optional(),     // Telegram WebApp initData (preferred)
  tgId: z.string().optional(),         // fallback for dev only
  username: z.string().optional(),
  visible: z.boolean().optional(),
})

function verifyTelegramInitData(initData: string, botToken?: string) {
  if (!botToken) return null
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) return null

  // Build data_check_string
  const entries: string[] = []
  for (const [k, v] of Array.from(params.entries())
    .filter(([k]) => k !== 'hash')
    .sort(([a], [b]) => a.localeCompare(b))) {
    entries.push(`${k}=${v}`)
  }
  const dataCheckString = entries.join('\n')

  // Secret = sha256(botToken)
  const secret1 = crypto.createHash('sha256').update(botToken).digest()
  const check1 = crypto.createHmac('sha256', secret1).update(dataCheckString).digest('hex')

  // Some SDKs use HMAC('WebAppData', token)
  const secret2 = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest()
  const check2 = crypto.createHmac('sha256', secret2).update(dataCheckString).digest('hex')

  if (hash !== check1 && hash !== check2) return null

  const userJson = params.get('user')
  if (!userJson) return null
  try {
    return JSON.parse(userJson) as { id: number; username?: string; first_name?: string; last_name?: string }
  } catch { return null }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { initData, tgId, username, visible } = Body.parse(body)

  let tgUser: { id: number; username?: string; first_name?: string; last_name?: string } | null = null

  if (initData) {
    tgUser = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN)
    if (!tgUser) {
      return NextResponse.json({ ok: false, error: 'BAD_INITDATA' }, { status: 401 })
    }
  }

  // Fallback only if explicit tgId+username sent (dev usage)
  const userData =
    tgUser
      ? { tgId: String(tgUser.id), username: tgUser.username || `${tgUser.first_name || 'User'} ${tgUser.last_name || ''}`.trim() }
      : (tgId && username ? { tgId, username } : null)

  if (!userData) {
    return NextResponse.json({ ok: false, error: 'MISSING_USER' }, { status: 400 })
  }

  const user = await prisma.user.upsert({
    where: { tgId: userData.tgId },
    create: { tgId: userData.tgId, username: userData.username, visible: visible ?? true },
    update: { username: userData.username, ...(visible === undefined ? {} : { visible }) },
  })

  const token = await issueSid(user.id)

  // Clear any previous sid first to avoid "guest" sticking around
  const res = NextResponse.json({ ok: true, user })
  res.cookies.set('sid', '', { httpOnly: true, sameSite: 'lax', maxAge: 0, path: '/' })
  res.cookies.set('sid', token, { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30, path: '/' })
  return res
}
