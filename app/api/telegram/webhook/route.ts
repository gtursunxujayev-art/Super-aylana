import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export const runtime = 'nodejs' // Prisma needs Node runtime

type TgFrom = {
  id?: number | string
  username?: string
  first_name?: string
  last_name?: string
}

type TgMessage = {
  message_id?: number
  from?: TgFrom
  text?: string
}

type TgUpdate = {
  update_id?: number
  message?: TgMessage
  // You can add other Telegram update types here if you handle them
}

export async function POST(req: NextRequest) {
  try {
    const update = (await req.json().catch(() => ({}))) as TgUpdate
    const msg = update?.message
    const from = msg?.from

    // If there is no "from" info, nothing to do—ack now so Telegram doesn’t retry
    if (!from?.id) {
      return NextResponse.json({ ok: true, ignored: true })
    }

    // Normalize Telegram data
    const tgId = String(from.id)
    const preferredUsername =
      from.username && from.username.trim().length > 0
        ? from.username.trim()
        : `${(from.first_name || 'User').trim()} ${(from.last_name || '').trim()}`.trim()

    // Avoid Prisma "upsert with non-unique field" error:
    // 1) Find by tgId (not unique in your current schema)
    // 2) Create or update accordingly
    const existing = await prisma.user.findFirst({
      where: { tgId }, // << not required to be unique
      select: { id: true, username: true, tgId: true },
    })

    if (!existing) {
      await prisma.user.create({
        data: {
          tgId,
          username: preferredUsername || `user_${tgId}`,
          // Leave other fields to their defaults in your schema (e.g., balance)
        },
      })
    } else if (existing.username !== preferredUsername) {
      await prisma.user.update({
        where: { id: existing.id }, // <- primary key is always unique
        data: { username: preferredUsername },
      })
    }

    // Optionally, you can process commands from msg.text here.
    // Keep it simple to avoid more schema friction.

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Telegram webhook error:', err)
    // Always return 200 to Telegram if you don’t want retries; or 500 to force retry
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}
