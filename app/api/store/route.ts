// app/api/store/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const items = await prisma.prize.findMany({
    where: { active: true, showInStore: true },
    orderBy: [{ coinCost: 'asc' }, { title: 'asc' }],
    select: { id:true, title:true, coinCost:true, imageUrl:true }
  })
  return NextResponse.json({ ok:true, items })
}
