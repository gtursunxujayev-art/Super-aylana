// app/api/admin/items/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { requireAdmin } from '@/app/api/requireAdmin'
import { z } from 'zod'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  await requireAdmin()
  const items = await prisma.prize.findMany({
    orderBy: [{ coinCost: 'asc' }, { title: 'asc' }],
    select: { id:true, title:true, coinCost:true, imageUrl:true, showInStore:true, active:true }
  })
  return NextResponse.json({ ok:true, items })
}

const Save = z.object({
  id: z.string().optional(),
  title: z.string(),
  coinCost: z.number().int(),
  imageUrl: z.string().url().optional(),
  showInStore: z.boolean(),
  active: z.boolean(),
})

export async function POST(req: Request) {
  await requireAdmin()
  const body = Save.parse(await req.json())

  // Update
  if (body.id) {
    const { id, ...rest } = body
    const item = await prisma.prize.update({
      where: { id },
      data: {
        title: rest.title,
        coinCost: rest.coinCost,
        showInStore: rest.showInStore,
        active: rest.active,
        ...(rest.imageUrl ? { imageUrl: rest.imageUrl } : {}),
      },
    })
    return NextResponse.json({ ok: true, item })
  }

  // Create (IMPORTANT: do not pass `id`; provide explicit fields)
  const { title, coinCost, showInStore, active, imageUrl } = body
  const item = await prisma.prize.create({
    data: {
      title,
      coinCost,
      showInStore,
      active,
      ...(imageUrl ? { imageUrl } : {}),
    },
  })
  return NextResponse.json({ ok: true, item })
}

export async function DELETE(req: Request) {
  await requireAdmin()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ ok:false, error:'id required' }, { status:400 })
  await prisma.prize.delete({ where:{ id } })
  return NextResponse.json({ ok:true })
}
