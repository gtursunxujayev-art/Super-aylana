// app/api/spin/start/route.ts
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { nanoid } from 'nanoid';

const redis = Redis.fromEnv();

const STATE_KEY = 'wheel:state';
const POPUP_KEY = 'wheel:lastPopup';
const LOCK_KEY  = 'wheel:lock';
const CHANNEL   = 'wheel:events';

type ReqBody = { mode?: 50|100|200 };

export async function POST(req: Request) {
  try {
    const { mode = 100 } = (await req.json().catch(()=>({}))) as ReqBody;

    // 1. Lock
    const got = await redis.set(LOCK_KEY, '1', { nx: true, ex: 20 });
    if (!got) return NextResponse.json({ error: 'BUSY' }, { status: 409 });

    // 2. Check state
    const cur = await redis.get<string>(STATE_KEY);
    if (cur && JSON.parse(cur).status === 'SPINNING') {
      await redis.del(LOCK_KEY);
      return NextResponse.json({ error: 'BUSY' }, { status: 409 });
    }

    // 3. Build new state
    const spinId = nanoid();
    const by = 'Giyosiddin'; // or from your auth
    const startedAt = Date.now();
    const state = { status: 'SPINNING' as const, spinId, by, mode, startedAt };

    // 4. Save and publish
    await redis.set(STATE_KEY, JSON.stringify(state));
    await redis.del(POPUP_KEY);
    await redis.publish(CHANNEL, JSON.stringify({ type: 'SPIN_START', ...state }));

    return NextResponse.json({ ok: true, spinId }, { status: 200 });

  } catch (err: any) {
    console.error('SPIN_START FAILED', err);
    await redis.del(LOCK_KEY);
    return NextResponse.json({ error: 'SERVER_ERROR', details: String(err?.message || err) }, { status: 500 });
  }
}
