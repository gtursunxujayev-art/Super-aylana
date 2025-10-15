// app/api/spin/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { getUserIdFromCookie } from '@/app/lib/auth'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function pick<T>(arr: T[]) { return arr[Math.floor(Math.random()*arr.length)] }

export async function POST(req: Request) {
  const h = headers() as unknown as Headers
  const userId = await getUserIdFromCookie(h)
  if (!userId) return NextResponse.json({ ok:false, error:'UNAUTHORIZED' }, { status: 401 })

  const { tier } = await req.json() as { tier: 50|100|200 }

  // transactional lock
  const result = await prisma.$transaction(async (tx) => {
    const state = await tx.spinState.findUnique({ where: { id:'global' }, select:{ status:true } })
    if (state?.status === 'SPINNING') throw new Error('BUSY')

    await tx.spinState.update({ where:{ id:'global' }, data:{ status:'SPINNING', byUserId:userId } })

    const me = await tx.user.findUniqueOrThrow({ where:{ id:userId } })
    if (me.balance < tier) throw new Error('NO_COINS')

    // Build wheel (admin-defined items with this price)
    const items = await tx.prize.findMany({
      where: { active: true, coinCost: tier },
      select: { id:true, title:true, weight:true, imageUrl:true }
    })
    // bonuses
    const bonus: { title:string; weight:number }[] =
      tier === 50 ? [{ title:'Another spin', weight:2 }, { title:'+75 coins', weight:1 }] :
      tier === 100 ? [{ title:'Another spin', weight:2 }, { title:'+150 coins', weight:1 }] :
      [{ title:'Another spin', weight:2 }, { title:'+300 coins', weight:1 }]

    const pool: { id?:string; title:string; imageUrl?:string|null; weight:number }[] = [
      ...items.map(i => ({ id:i.id, title:i.title, imageUrl:i.imageUrl, weight:i.weight ?? 1 })),
      ...bonus
    ]
    // weighted pick
    const total = pool.reduce((s,p)=>s+(p.weight||1),0)
    let r = Math.random()*total
    let sel = pool[0]
    for (const p of pool) { r -= (p.weight||1); if (r <= 0) { sel = p; break } }

    // spend coins / apply bonus
    let winTitle = sel.title
    let prizeId: string|null = null
    let give = 0
    if (sel.id) prizeId = sel.id
    if (sel.title.includes('Another spin')) give = tier // refund this tier
    if (sel.title.startsWith('+')) give = parseInt(sel.title.replace(/\D/g,'')) || 0

    await tx.user.update({
      where:{ id:userId },
      data:{ balance: { decrement: tier, increment: give } as any }
    })

    const w = await tx.win.create({
      data: { userId, prizeId: prizeId || undefined, title: winTitle }
    })

    await tx.spinState.update({ where:{ id:'global' }, data:{ status:'IDLE', byUserId:null } })

    return { wId: w.id, title: winTitle, imageUrl: sel?.imageUrl ?? null }
  }).catch(e => ({ error: e.message as string }))

  if ('error' in result) {
    const code = result.error === 'BUSY' ? 409 : result.error === 'NO_COINS' ? 400 : 500
    return NextResponse.json({ ok:false, error: result.error }, { status: code })
  }

  return NextResponse.json({ ok:true, win: result })
}
