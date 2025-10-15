import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set('sid', '', { httpOnly: true, sameSite: 'lax', maxAge: 0, path: '/' })
  return res
}
