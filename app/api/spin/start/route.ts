// app/api/spin/start/route.ts
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { nanoid } from 'nanoid';

const redis = Redis.fromEnv();

const STATE_KEY = 'wheel:state';
const POPUP_KEY = 'wheel:lastPopup';
const LOCK_KEY  = 'wheel:lock';
const CHANNEL   = 'wheel:events'; // consumed by /api/spin/stream SSE

type ReqBody = { mode?: 50|100|200 };
type WheelState = { status:'SPINNING'; spinId:string; by:string; mode:50|100|200; startedAt:number };

export async function POST(req: Request) {
  const { mode = 100 } = (await req.json().catch(()=>({}))) as ReqBody;

  // Simple lock: expire automatically in 20s
  const got = await redis.set(LOCK_KEY, '1', { nx: true, ex: 20 });
  if (!got) return NextResponse.json({ error: 'BUSY' }, { status: 409 });

  try {
    const cur = await redis.get<string>(STATE_KEY);
    if (cur && JSON.parse(cur).status === 'SPINNING') {
      await redis.del(LOCK_KEY);
      return NextResponse.json({ error: 'BUSY' }, { status: 409 });
    }

    const spinId = nanoid();
    // TODO: set from your auth/user; fallback keeps working
    const by = 'Guest';
    const startedAt = Date.now();
    const state: WheelState = { status: 'SPINNING', spinId, by, mode, startedAt };

    await redis.set(STATE_KEY, JSON.stringify(state));
    await redis.del(POPUP_KEY); // clear previous popup
    await redis.publish(CHANNEL, JSON.stringify({ type: 'SPIN_START', ...state }));

    return NextResponse.json({ ok: true, spinId }, { status: 200 });
  } catch (e) {
    await redis.del(LOCK_KEY);
    return NextResponse.json({ error: 'FAIL' }, { status: 500 });
  }
}
