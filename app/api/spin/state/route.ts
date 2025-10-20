// app/api/spin/state/route.ts
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

const STATE_KEY = 'wheel:state';       // {status:'IDLE'|'SPINNING', spinId?, by?, mode?, startedAt?}
const POPUP_KEY = 'wheel:lastPopup';   // {spinId, user, prize, imageUrl?, mode?}
const LOCK_KEY  = 'wheel:lock';        // simple lock used by /spin/start

type WheelState = {
  status: 'IDLE' | 'SPINNING';
  spinId?: string;
  by?: string;
  mode?: 50 | 100 | 200;
  startedAt?: number; // ms epoch
};

type Popup = {
  spinId: string;
  user: string;
  prize: string;
  imageUrl?: string | null;
  mode?: 50 | 100 | 200;
};

async function getJSON<T>(key: string): Promise<T | null> {
  try {
    const raw = await redis.get<string>(key);
    if (!raw) return null;
    if (typeof raw === 'string') return JSON.parse(raw) as T;
    return raw as any as T;
  } catch {
    return null;
  }
}

export async function GET() {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  };

  let state = (await getJSON<WheelState>(STATE_KEY)) ?? { status: 'IDLE' as const };
  const lastPopup = await getJSON<Popup>(POPUP_KEY);

  // Auto-heal: if stuck spinning >20s with no popup, reset to IDLE & release lock
  if (state.status === 'SPINNING') {
    const now = Date.now();
    const startedAt = typeof state.startedAt === 'number' ? state.startedAt : now;
    const elapsed = Math.max(0, now - startedAt);
    if (elapsed > 20000 && !lastPopup) {
      state = { status: 'IDLE' };
      await redis.set(STATE_KEY, JSON.stringify(state));
      await redis.del(LOCK_KEY);
    }
  }

  // Ensure startedAt is present during SPINNING so the UI can time a ~10s spin
  if (state.status === 'SPINNING' && !state.startedAt) {
    state.startedAt = Date.now();
    await redis.set(STATE_KEY, JSON.stringify(state));
  }

  return new NextResponse(JSON.stringify({ state, lastPopup }), { status: 200, headers });
}
