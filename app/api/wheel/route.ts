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

  if (nt.length) {
    labels.push(...pick2(nt).map(p => p.title))
  } else if (nextTier === 500) {
    // fallback if no 500-tier prizes exist yet
    labels.push('500 coin sovg‘a', '500 coin sovg‘a')
  }

  // only real admin-added prizes for the current tier
  labels.push(...sameTier.map(p => p.title))

  // NOTE: do NOT pad to 12; wheel will draw exactly as many slices as we have
  return NextResponse.json({ ok: true, labels })
}
