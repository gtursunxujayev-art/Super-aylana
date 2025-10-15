// app/api/bootstrap/route.ts
import { NextResponse } from 'next/server';

/**
 * Bootstrap endpoint is disabled in production.
 * It used to seed an admin & issue a session, but the new auth no longer uses it.
 * Keeping this stub avoids build-time import errors.
 */
export async function GET() {
  return NextResponse.json({ ok: false, error: 'BOOTSTRAP_DISABLED' }, { status: 404 });
}

export async function POST() {
  return NextResponse.json({ ok: false, error: 'BOOTSTRAP_DISABLED' }, { status: 404 });
}
