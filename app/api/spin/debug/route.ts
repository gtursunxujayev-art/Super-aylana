export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import {
  redis,
  REDIS_LOCK_KEY,
  REDIS_STATE_KEY,
  REDIS_LAST_POP_KEY,
} from "@/app/lib/redis";

export async function GET() {
  try {
    const [stateRaw, popRaw, lock] = await Promise.all([
      redis.get<string>(REDIS_STATE_KEY),
      redis.get<string>(REDIS_LAST_POP_KEY),
      redis.get<string>(REDIS_LOCK_KEY),
    ]);

    const state = stateRaw ? JSON.parse(stateRaw) : null;
    const lastPopup = popRaw ? JSON.parse(popRaw) : null;

    // Show a short fingerprint of the Redis URL so you can confirm both tabs use the SAME DB
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL || "";
    const fp = redisUrl.slice(0, 24) + "..." + redisUrl.slice(-10);

    return new NextResponse(
      JSON.stringify({
        ok: true,
        redis_url_fp: fp,
        now: Date.now(),
        state,
        lastPopup,
        lock,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

