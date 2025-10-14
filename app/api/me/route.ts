import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { getUserIdFromCookie } from '@/app/api/bootstrap/route'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: Request) {
  const uid = await getUserIdFromCookie(req.headers)
  if (!uid) return NextResponse.json({ ok:false, error:'UNAUTHORIZED' }, { status:401 })
  const me = await prisma.user.findUnique({ where:{ id: uid }, select:{ id:true, username:true, balance:true } })
  return NextResponse.json({ ok:true, me })
}