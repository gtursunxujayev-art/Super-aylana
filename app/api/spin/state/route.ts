export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { redis, REDIS_STATE_KEY, REDIS_LAST_POP_KEY, REDIS_VER_KEY } from "@/app/lib/redis";

export async function GET() {
  try {
    const [stateRaw, popRaw, ver] = await Promise.all([
      redis.get<string>(REDIS_STATE_KEY),
      redis.get<string>(REDIS_LAST_POP_KEY),
      redis.get<number>(REDIS_VER_KEY),
    ]);

    const state = stateRaw ? JSON.parse(stateRaw) : { status: "IDLE", spinId: null };
    const lastPopup = popRaw ? JSON.parse(popRaw) : null;

    return new NextResponse(JSON.stringify({
      state,
      lastPopup,
      ver: ver ?? 0,
      _ts: Date.now(),
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch {
    return new NextResponse(JSON.stringify({
      state: { status: "IDLE", spinId: null },
      lastPopup: null, ver: 0, _ts: Date.now(),
    }), { status: 200, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" }});
  }
}
