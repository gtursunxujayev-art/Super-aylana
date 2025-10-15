import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { tgSendMessage } from '../../../lib/telegram'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs' // Telegram can retry; use node runtime

// Minimal command handler
export async function POST(req: Request) {
  // Verify Telegram secret header (set when you register the webhook)
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  const got = req.headers.get('x-telegram-bot-api-secret-token')
  if (secret && got !== secret) {
    return NextResponse.json({ ok: false, error: 'BAD_SECRET' }, { status: 401 })
  }

  const update = await req.json().catch(() => ({}))
  // message or edited_message
  const msg = update.message || update.edited_message
  const callback = update.callback_query

  if (msg) {
    const chatId = msg.chat?.id
    const text: string = (msg.text || '').trim()

    // Auto-register/refresh user if we know their id
    const from = msg.from
    if (from?.id) {
      await prisma.user.upsert({
        where: { tgId: String(from.id) },
        create: {
          tgId: String(from.id),
          username: from.username || `${from.first_name || 'User'} ${from.last_name || ''}`.trim(),
          visible: true,
        },
        update: {
          username: from.username || `${from.first_name || 'User'} ${from.last_name || ''}`.trim(),
        },
      })
    }

    if (text === '/start') {
      // Show WebApp button
      await tgSendMessage(chatId, 'Super-aylana: o‘yin ni boshlash uchun tugmani bosing 👇', {
        reply_markup: {
          inline_keyboard: [[{
            text: 'WebApp ni ochish',
            web_app: { url: process.env.NEXT_PUBLIC_BASE_URL || `https://${req.headers.get('host')}` }
          }]],
        },
      })
      return NextResponse.json({ ok: true })
    }

    if (text === '/balance') {
      if (!from?.id) { await tgSendMessage(chatId, 'Balansni topib bo‘lmadi.'); return NextResponse.json({ ok: true }) }
      const u = await prisma.user.findUnique({ where: { tgId: String(from.id) } })
      await tgSendMessage(chatId, `Sizning balansingiz: <b>${u?.balance ?? 0}</b> tanga.`)
      return NextResponse.json({ ok: true })
    }

    // fallback
    await tgSendMessage(chatId, 'Buyruqlar: /start, /balance')
    return NextResponse.json({ ok: true })
  }

  // Optional: handle callback_query etc.
  if (callback) {
    // no callbacks yet
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ ok: true })
}
