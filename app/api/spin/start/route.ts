// app/api/spin/start/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { prisma } from "@/app/lib/prisma";
import { ensureUser } from "@/app/lib/auth";
import { nanoid } from "nanoid";

/**
 * Stronger version with:
 * - Clear env checks (Redis variables)
 * - Defensive error paths with readable error codes
 * - Safe lock handling
 * - Clear JSON responses consumed by the client
 */

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const STATE_KEY = "wheel:state";
const POPUP_KEY = "wheel:lastPopup";
const LOCK_KEY = "wheel:lock";
const CHANNEL = "wheel:events";

type ReqBody = { mode?: 50 | 100 | 200 };

function json(status: number, data: any) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export async function POST(req: Request) {
  // 1) Sanity: required env
  if (!REDIS_URL || !REDIS_TOKEN) {
    return json(500, {
      error: "MISSING_REDIS_ENV",
      details:
        "UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is not set in the environment.",
    });
  }

  const redis = Redis.fromEnv();

  let lockAcquired = false;

  try {
    const body = (await req.json().catch(() => ({}))) as ReqBody;
    const mode = (body.mode as 50 | 100 | 200) ?? 100;

    // 2) Identify / auto-create user
    const user = await ensureUser(req);

    // 3) Check balance from DB
    const fresh = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, balance: true, name: true, login: true },
    });

    if (!fresh) return json(400, { error: "NO_USER" });
    if (fresh.balance < mode) return json(403, { error: "NOT_ENOUGH_COINS" });

    // 4) Global lock (20 seconds)
    const set = await redis.set(LOCK_KEY, "1", { nx: true, ex: 20 });
    if (!set) {
      return json(409, { error: "BUSY", details: "Another spin is in progress." });
    }
    lockAcquired = true;

    // 5) Check state
    const existing = await redis.get<string>(STATE_KEY);
    if (existing) {
      const parsed = JSON.parse(existing);
      if (parsed?.status === "SPINNING") {
        // release lock and exit
        await redis.del(LOCK_KEY);
        lockAcquired = false;
        return json(409, { error: "BUSY", details: "Another spin is in progress." });
      }
    }

    // 6) Deduct coins first (so user sees deduction immediately)
    await prisma.user.update({
      where: { id: user.id },
      data: { balance: { decrement: mode } },
    });

    // 7) Publish SPIN_START
    const spinId = nanoid();
    const by = fresh.name || fresh.login;
    const startedAt = Date.now();

    const state = { status: "SPINNING" as const, spinId, by, mode, startedAt };
    await redis.set(STATE_KEY, JSON.stringify(state));
    await redis.del(POPUP_KEY);
    await redis.publish(CHANNEL, JSON.stringify({ type: "SPIN_START", ...state }));

    // Keep the lock; the /result route should release it when spin is over.
    return json(200, { ok: true, spinId });
  } catch (e: any) {
    // Always release lock on unexpected error
    if (lockAcquired) {
      try {
        await Redis.fromEnv().del(LOCK_KEY);
      } catch {}
    }
    console.error("[/api/spin/start] SERVER_ERROR:", e);
    return json(500, {
      error: "SERVER_ERROR",
      details: String(e?.message || e),
    });
  }
}
