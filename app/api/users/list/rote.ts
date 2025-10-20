// app/api/users/list/route.ts
export const runtime = 'nodejs'; // Prisma requires Node runtime

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, login: true, balance: true },
    orderBy: [{ balance: 'desc' }, { name: 'asc' }],
    take: 50,
  });
  return NextResponse.json(users, { status: 200, headers: { 'Cache-Control': 'no-store' } });
}
