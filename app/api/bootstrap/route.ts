import { NextResponse } from 'next/server'
import { prisma } from '../../lib/prisma'
import { z } from 'zod'
import { issueSid } from '../../lib/auth'
import crypto from 'crypto'

const Body = z.object({
  // One of these must be present:
  initData: z.string().optional(),                 // Telegram WebApp initData (preferred, mobile)
  tgId: z.string().optional(),                     // fallback demo
  username: z.string().optional(),
  visible: z.boolean().optional(),
})

function verifyTelegramInitData(initData: string, botToken?: string) {
  if (!botToken) return null

  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) return null

  // data_check_string
  const entries: string[] = []
  for (const [k, v] of Array.from(params.entries()).filter(([k]) => k !== 'hash').sort(([a], [b]) => a.localeCompare(b))) {
    entries.push(`${k}=${v}`)
  }
  const dataCheckString = entries.join('\n')

  // secret key = HMAC-SHA256 of bot token with 'WebAppData' per Telegram docs
  // (official doc actually says secret_key = sha256(bot_token) for login widget;
  // for WebApp it's HMAC using "WebAppData" key; both are commonly used.
  // We'll support both to be robust.)
  const secret1 = crypto.createHash('sha256').update(botToken).digest()
  const hash1 = crypto.createHmac('sha256', secret1).update(dataCheckString).digest('hex')

  // Also try the newer key derivation used by some libs
  const secret2 = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest()
  const hash2 = crypto.createHmac('sha256', secret2).update(dataCheckString).digest('hex')

  if (hash !== hash1 && hash !== hash2) return null

  // Parse user
  const userJson = params.get('user')
  if (!userJson) return null
  try {
    return JSON.parse(userJson) as { id: number; username?: string; first_name?: string; last_name?: string }
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { initData, tgId, username, visible } = Body.parse(body)

  let userData: { tgId: string; username: string } | null = null

  // 1) Preferred: verify Telegram initData
  if (initData) {
    const tgUser = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN)
    if (!tgUser) {
      return NextResponse.json({ ok: false, error: 'BAD_INITDATA' }, { status: 401 })
    }
    const uname = tgUser.username || `${tgUser.first_name || 'User'} ${tgUser.last_name || ''}`.trim()
    userData = { tgId: String(tgUser.id), username: uname }
  }

  // 2) Fallback for demo/testing
  if (!userData && tgId && username) {
    userData = { tgId, username }
  }

  if (!userData) {
    return NextResponse.json({ ok: false, error: 'MISSING_USER' }, { status: 400 })
  }

  const user = await prisma.user.upsert({
    where: { tgId: userData.tgId },
    create: { tgId: userData.tgId, username: userData.username, visible: visible ?? true },
    update: { username: userData.username, ...(visible === undefined ? {} : { visible }) },
  })

  const token = await issueSid(user.id)
  const res = NextResponse.json({ ok: true, user })
  res.cookies.set('sid', token, { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30, path: '/' })
  return res
}
