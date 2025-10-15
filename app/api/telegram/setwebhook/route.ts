import { NextResponse } from 'next/server'
import { tgDeleteWebhook, tgSetWebhook } from '../../../lib/telegram'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function isAdmin(req: Request) {
  const key = req.headers.get('x-admin-key')
  return !!key && key === process.env.ADMIN_API_KEY
}

export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 })
  const { url } = await req.json().catch(() => ({}))
  if (!url) return NextResponse.json({ ok: false, error: 'NO_URL' }, { status: 400 })
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  const res = await tgSetWebhook(url, secret)
  return NextResponse.json(res)
}

export async function DELETE(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 })
  const res = await tgDeleteWebhook()
  return NextResponse.json(res)
}
