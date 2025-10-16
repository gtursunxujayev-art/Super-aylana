import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/app/lib/prisma'
import { getUserIdFromCookie } from '@/app/lib/auth'

/**
 * This route reads the user from cookies() (✅ correct type for getUserIdFromCookie),
 * sanity-checks a requested tier (50 | 100 | 200), and deducts coins.
 *
 * NOTE:
 * - This version focuses on fixing the build error by using cookies().
 * - It avoids touching optional tables/fields that have varied in your schema
 *   (SpinState, Win, Prize, etc.) to prevent further Prisma type compile errors.
 * - You can extend it later to record spins/wins once your schema stabilizes.
 */

export const runtime = 'nodejs' // Prisma needs Node runtime

const ALLOWED_TIERS = new Set([50, 100, 200])

export async function POST(req: NextRequest) {
  try {
    // ✅ Use cookies() instead of req.headers
    const uid = await getUserIdFromCookie(cookies())
    if (!uid) {
      return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 })
    }

    // Read requested tier; default to 50 if absent/invalid
    let tier = 50
    try {
      const body = await req.json()
      const t = Number(body?.tier)
      if (ALLOWED_TIERS.has(t)) tier = t
    } catch {
      // ignore bad JSON; keep default
    }

    // Load user and check balance
    const user = await prisma.user.findUnique({
      where: { id: uid },
      select: { id: true, balance: true },
    })

    if (!user) {
      return NextResponse.json({ ok: false, error: 'USER_NOT_FOUND' }, { status: 404 })
    }

    if ((user.balance ?? 0) < tier) {
      return NextResponse.json({ ok: false, error: 'NO_COINS' }, { status: 400 })
    }

    // Deduct coins atomically
    const updated = await prisma.user.update({
      where: { id: uid },
      data: { balance: { decrement: tier } },
      select: { id: true, balance: true },
    })

    // Return a basic result payload (extend later with prize/win logic)
    return NextResponse.json({
      ok: true,
      tier,
      newBalance: updated.balance ?? 0,
      message: 'Spin registered (coins deducted). Extend this route to award prizes as needed.',
    })
  } catch (err) {
    console.error('Spin route error:', err)
    return NextResponse.json({ ok: false, error: 'SERVER_ERROR' }, { status: 500 })
  }
}