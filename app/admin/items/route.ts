// app/api/admin/items/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { z } from 'zod'
import { requireAdmin } from '@/app/api/requireAdmin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  await requireAdmin()
  const items = await prisma.prize.findMany({
    orderBy: [{ coinCost: 'asc' }, { title: 'asc' }],
    select: { id:true, title:true, coinCost:true, imageUrl:true, showInStore:true, active:true }
  })
  return NextResponse.json({ ok: true, items })
}

const Save = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  coinCost: z.number().int().min(0),
  imageUrl: z.string().url().optional(),
  showInStore: z.boolean(),
  active: z.boolean(),
})

export async function POST(req: Request) {
  await requireAdmin()
  const body = Save.parse(await req.json())

  if (body.id) {
    const { id, ...data } = body
    const p = await prisma.prize.update({ where: { id }, data })
    return NextResponse.json({ ok: true, item: p })
  } else {
    const p = await prisma.prize.create({ data: body })
    return NextResponse.json({ ok: true, item: p })
  }
}

export async function DELETE(req: Request) {
  await requireAdmin()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ ok:false, error:'id required' }, { status: 400 })
  await prisma.prize.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
