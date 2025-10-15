// app/lib/auth.ts
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const COOKIE_NAME = 'sid';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function getSecret(): string {
  const s = process.env.JWT_SECRET || process.env.NEXT_PUBLIC_JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not set');
  return s;
}

type Payload = { sub: string; role?: 'admin' | 'user' };

export function issueSession(userId: string, isAdmin: boolean) {
  const token = jwt.sign({ sub: userId, role: isAdmin ? 'admin' : 'user' } as Payload, getSecret(), {
    algorithm: 'HS256',
    expiresIn: MAX_AGE,
  });
  // httpOnly cookie via headers API
  cookies().set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: MAX_AGE,
  });
}

export function clearSession() {
  cookies().set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 0,
  });
}

export function readSession():
  | { userId: string; role: 'admin' | 'user' }
  | null {
  const c = cookies().get(COOKIE_NAME)?.value;
  if (!c) return null;
  try {
    const payload = jwt.verify(c, getSecret()) as Payload;
    return { userId: payload.sub, role: payload.role ?? 'user' };
  } catch {
    return null;
  }
}

export function requireSession(): { userId: string; role: 'admin' | 'user' } {
  const s = readSession();
  if (!s) throw new Error('UNAUTHORIZED');
  return s;
}

export function requireAdminSession(): { userId: string } {
  const s = readSession();
  if (!s || s.role !== 'admin') throw new Error('FORBIDDEN');
  return { userId: s.userId };
}
