import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'   // ⬅️ ../../../lib/prisma

function auth(req: Request) {
  const k = req.headers.get('x-admin-key')
  if (k !== process.env.ADMIN_API_KEY) throw new Error('forbidden')
}

export async function GET(req: Request) {
  try { auth(req) } catch { return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 }) }
  const prizes = await prisma.prize.findMany({ orderBy: { coinCost: 'asc' } })
  return NextResponse.json(prizes)
}

export async function POST(req: Request) {
  try { auth(req) } catch { return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 }) }
  const body = await req.json() as { title: string; coinCost: number; imageUrl?: string; active?: boolean; showInStore?: boolean }
  const p = await prisma.prize.create({ data: body })
  return NextResponse.json(p)
}

export async function PATCH(req: Request) {
  try { auth(req) } catch { return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 }) }
  const body = await req.json() as { id: string } & Partial<{ title: string; coinCost: number; imageUrl?: string | null; active: boolean; showInStore: boolean }>
  const p = await prisma.prize.update({ where: { id: body.id }, data: body })
  return NextResponse.json(p)
}