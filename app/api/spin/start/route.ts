// app/api/spin/start/route.ts
export const runtime = "edge";

import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { nanoid } from "nanoid";

const redis = Redis.fromEnv();

const STATE_KEY = "wheel:state";
const POPUP_KEY = "wheel:lastPopup";
const LOCK_KEY  = "wheel:lock";
const CHANNEL   = "wheel:events"; // consumed by /api/spin/stream SSE

type ReqBody = { mode?: 50 | 100 | 200 };

export async function POST(req: Request) {
  try {
    const { mode = 100 } = ((await req.json().catch(() => ({}))) as ReqBody);

    // 1) acquire lock (expires in 20s automatically)
    const got = await redis.set(LOCK_KEY, "1", { nx: true, ex: 20 });
    if (!got) return NextResponse.json({ error: "BUSY" }, { status: 409 });

    // 2) verify not already spinning
    const curRaw = await redis.get<string>(STATE_KEY);
    if (curRaw && JSON.parse(curRaw).status === "SPINNING") {
      await redis.del(LOCK_KEY);
      return NextResponse.json({ error: "BUSY" }, { status: 409 });
    }

    // 3) build new state
    const spinId = nanoid();
    // TODO: replace with your authenticated user
    const by = "Guest";
    const startedAt = Date.now();
    const state = { status: "SPINNING" as const, spinId, by, mode, startedAt };

    // 4) persist + publish
    await redis.set(STATE_KEY, JSON.stringify(state));
    await redis.del(POPUP_KEY); // clear last result
    await redis.publish(CHANNEL, JSON.stringify({ type: "SPIN_START", ...state }));

    return NextResponse.json({ ok: true, spinId }, { status: 200 });
  } catch (err: any) {
    try { await redis.del(LOCK_KEY); } catch {}
    console.error("SPIN_START FAILED", err);
    return NextResponse.json(
      { error: "SERVER_ERROR", details: String(err?.message || err) },
      { status: 500 }
    );
  }
}
