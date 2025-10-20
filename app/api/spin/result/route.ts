// app/api/spin/result/route.ts
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const STATE_KEY = 'wheel:state';
const POPUP_KEY = 'wheel:lastPopup';
const LOCK_KEY  = 'wheel:lock';
const CHANNEL   = 'wheel:events';

type Popup = { spinId:string; user:string; prize:string; imageUrl?:string|null; mode?:50|100|200 };

export async function POST(req: Request) {
  const popup = (await req.json().catch(()=>null)) as Popup | null;
  if (!popup?.spinId) return NextResponse.json({ error:'bad payload' }, { status: 400 });

  // Persist popup (short TTL so slow clients still see it)
  await redis.set(POPUP_KEY, JSON.stringify(popup), { ex: 45 });
  // Reset state & release lock
  await redis.set(STATE_KEY, JSON.stringify({ status: 'IDLE' }));
  await redis.del(LOCK_KEY);
  // Publish to SSE listeners
  await redis.publish(CHANNEL, JSON.stringify({ type: 'SPIN_RESULT', popup }));

  return NextResponse.json({ ok: true }, { status: 200 });
}
