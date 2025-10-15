import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import bcrypt from 'bcryptjs';
import { issueSession } from '@/app/lib/auth';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ ok: false, error: 'REQUIRED' }, { status: 400 });
    }

    // Use findFirst to avoid the strict composite unique Prisma type you saw in logs
    const user = await prisma.user.findFirst({ where: { username } });

    if (!user || !user.passwordHash) {
      return NextResponse.json({ ok: false, error: 'INVALID' }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ ok: false, error: 'INVALID' }, { status: 401 });
    }

    issueSession(user.id, !!(user as any).isAdmin);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'SERVER' }, { status: 500 });
  }
}
