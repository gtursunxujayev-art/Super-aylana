import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: Request) {
  const url = new URL(req.url)
  const take = Math.min(Number(url.searchParams.get('take') ?? 10), 30)
  const wins = await prisma.win.findMany({
    orderBy: { createdAt: 'desc' }, take,
    select: { title:true, imageUrl:true, user:{ select: { username:true } } }
  })
  return NextResponse.json(wins.map(w => ({ user:w.user.username, title:w.title, imageUrl:w.imageUrl })))
}