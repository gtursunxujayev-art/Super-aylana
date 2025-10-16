import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { prisma } from '@/app/lib/prisma'
import { getUserIdFromCookie } from '@/app/lib/auth'

// Prisma needs Node runtime
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Accept a JSON body like { "coins": 50 } (default 50)
const BodySchema = z
  .object({
    coins: z.number().int().min(-1_000_000).max(1_000_000).optional(),
  })
  .default({ coins: 50 })

export async function POST(req: NextRequest) {
  // Guard this dev endpoint unless explicitly enabled
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_DEV_GRANT !== '1') {
    return NextResponse.json({ ok: false, error: 'DISABLED' }, { status: 403 })
  }

  // ✅ Pass cookies() (ReadonlyRequestCookies), not req.headers
  const uid = await getUserIdFromCookie(cookies())
  if (!uid) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'BAD_REQUEST' }, { status: 400 })
  }
  const coins = parsed.data.coins ?? 50

  // Update balance
  const user = await prisma.user.update({
    where: { id: uid },
    data: { balance: { increment: coins } },
    select: { id: true, username: true, balance: true },
  })

  return NextResponse.json({ ok: true, user })
}