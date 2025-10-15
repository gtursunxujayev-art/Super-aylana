import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { readSession } from '@/app/lib/auth';

export async function GET() {
  const s = readSession();
  if (!s) return NextResponse.json({ ok: false, user: null });

  const user = await prisma.user.findUnique({
    where: { id: s.userId },
    select: { id: true, username: true, balance: true, isAdmin: true },
  });

  return NextResponse.json({ ok: true, user });
}
