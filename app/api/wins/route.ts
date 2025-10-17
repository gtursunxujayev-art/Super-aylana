import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    // optional ?take=... (defaults to 10, clamped)
    const url = new URL(req.url)
    const takeParam = url.searchParams.get('take')
    let take = Number.parseInt(takeParam || '', 10)
    if (!Number.isFinite(take)) take = 10
    take = Math.min(Math.max(take, 1), 50)

    const wins = await prisma.win.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        title: true,
        // imageUrl is not on Win — select it from the related Prize
        prize: { select: { imageUrl: true } },
        user: { select: { username: true } },
      },
    })

    // shape response: { user, title, imageUrl }
    const payload = wins.map((w) => ({
      user: w.user.username,
      title: w.title,
      imageUrl: w.prize?.imageUrl ?? null,
    }))

    return NextResponse.json(payload)
  } catch (err) {
    console.error('GET /api/wins error:', err)
    return NextResponse.json({ ok: false, error: 'INTERNAL' }, { status: 500 })
  }
}