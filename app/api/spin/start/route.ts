// app/api/spin/start/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { prisma } from "@/app/lib/prisma";
import { ensureUser } from "@/app/lib/auth";
import { nanoid } from "nanoid";

const redis = Redis.fromEnv();

const STATE_KEY = "wheel:state";
const POPUP_KEY = "wheel:lastPopup";
const LOCK_KEY  = "wheel:lock";
const CHANNEL   = "wheel:events";

type ReqBody = { mode?: 50 | 100 | 200 };

export async function POST(req: Request) {
  try {
    const { mode = 100 } = ((await req.json().catch(() => ({}))) as ReqBody);

    // Identify (or create) the current user
    const user = await ensureUser(req);

    // Coins check (atomic-ish)
    const fresh = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, balance: true, name: true, login: true },
    });
    if (!fresh) return NextResponse.json({ error: "NO_USER" }, { status: 400 });
    if (fresh.balance < mode) {
      return NextResponse.json({ error: "NOT_ENOUGH_COINS" }, { status: 403 });
    }

    // Basic lock (20s)
    const got = await redis.set(LOCK_KEY, "1", { nx: true, ex: 20 });
    if (!got) return NextResponse.json({ error: "BUSY" }, { status: 409 });

    // Check state
    const curRaw = await redis.get<string>(STATE_KEY);
    if (curRaw && JSON.parse(curRaw).status === "SPINNING") {
      await redis.del(LOCK_KEY);
      return NextResponse.json({ error: "BUSY" }, { status: 409 });
    }

    // Deduct coins *before* spin (so balance label reflects deduction immediately)
    await prisma.user.update({
      where: { id: user.id },
      data: { balance: { decrement: mode } },
    });

    const spinId = nanoid();
    const by = fresh.name || fresh.login;
    const startedAt = Date.now();
    const state = { status: "SPINNING" as const, spinId, by, mode, startedAt };

    await redis.set(STATE_KEY, JSON.stringify(state));
    await redis.del(POPUP_KEY);
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
