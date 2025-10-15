import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ ok: false, error: 'REQUIRED' }, { status: 400 });
    }

    const exists = await prisma.user.findFirst({ where: { username } });
    if (exists) {
      return NextResponse.json({ ok: false, error: 'USERNAME_TAKEN' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Adjust fields if your schema uses different names
    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        isAdmin: false,
        balance: 0,
      },
      select: { id: true, username: true },
    });

    return NextResponse.json({ ok: true, user });
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'SERVER' }, { status: 500 });
  }
}
