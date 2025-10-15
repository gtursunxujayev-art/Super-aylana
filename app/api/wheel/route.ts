import { NextResponse } from 'next/server'
import { prisma } from '../../lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function pick2<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a.slice(0, 2)
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const tier = Number(url.searchParams.get('tier') || 50)
  if (![50, 100, 200].includes(tier)) {
    return NextResponse.json({ ok: false, error: 'BAD_TIER' }, { status: 400 })
  }

  const sameTier = await prisma.prize.findMany({
    where: { active: true, coinCost: tier },
    orderBy: { createdAt: 'asc' }
  })

  const nextTier = tier === 50 ? 100 : tier === 100 ? 200 : 500
  const nt = await prisma.prize.findMany({ where: { active: true, coinCost: nextTier } })

  const labels: string[] = []
  labels.push('Another spin')
  labels.push(`+${tier === 50 ? 75 : tier === 100 ? 150 : 300} coins`)

  const twoNext = nt.length ? pick2(nt).map(p => p.title) :
    (nextTier === 500 ? ['500 coin sovg‘a', '500 coin sovg‘a'] : [])

  labels.push(...twoNext)
  labels.push(...sameTier.map(p => p.title))

  // pad to 12
  while (labels.length < 12) labels.push('Prize')

  return NextResponse.json({ ok: true, labels: labels.slice(0, 12) })
}