// app/api/spin/start/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { prisma } from "@/app/lib/prisma";
import { ensureUser } from "@/app/lib/auth";
import { nanoid } from "nanoid";

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const STATE_KEY = "wheel:state";
const POPUP_KEY = "wheel:lastPopup";
const LOCK_KEY = "wheel:lock";
const CHANNEL = "wheel:events";

type Mode = 50 | 100 | 200;
type ReqBody = { mode?: Mode };

type SpinState =
  | { status: "IDLE" }
  | {
      status: "SPINNING";
      spinId: string;
      by: string;
      mode: Mode;
      startedAt: number;
    };

/** ---------- helpers ---------- */
function json(status: number, data: any) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

/** Safe parse for values that may be bad legacy strings like "[object Object]" */
function safeParse<T>(val: unknown): T | null {
  try {
    if (val == null) return null;
    if (typeof val === "string") {
      // must be valid JSON
      return JSON.parse(val) as T;
    }
    // If an older build stored a real object (or redis coerced to string),
    // accept it if it already looks like JSON.
    if (typeof val === "object") return val as T;
    return null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  // env check
  if (!REDIS_URL || !REDIS_TOKEN) {
    return json(500, {
      error: "MISSING_REDIS_ENV",
      details: "UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is not set.",
    });
  }

  const redis = Redis.fromEnv();
  let lockAcquired = false;

  try {
    const body = (await req.json().catch(() => ({}))) as ReqBody;
    const mode: Mode = (body.mode as Mode) ?? 100;

    // identify / autocreate user
    const me = await ensureUser(req);

    // fresh balance
    const dbUser = await prisma.user.findUnique({
      where: { id: me.id },
      select: { id: true, balance: true, name: true, login: true },
    });
    if (!dbUser) return json(400, { error: "NO_USER" });
    if (dbUser.balance < mode) return json(403, { error: "NOT_ENOUGH_COINS" });

    // acquire global lock for at most 20s
    const locked = await redis.set(LOCK_KEY, "1", { nx: true, ex: 20 });
    if (!locked) {
      return json(409, { error: "BUSY", details: "Another spin is in progress." });
    }
    lockAcquired = true;

    // read current state (and auto-clean bad legacy values)
    const raw = await redis.get(STATE_KEY);
    const state = safeParse<SpinState>(raw);

    if (state && state.status === "SPINNING") {
      // someone is spinning already — release our lock and abort
      await redis.del(LOCK_KEY);
      lockAcquired = false;
      return json(409, { error: "BUSY", details: "Another spin is in progress." });
    }

    // If legacy garbage like "[object Object]" was stored, clean it now
    if (!state || (state as any).status == null) {
      await redis.set(STATE_KEY, JSON.stringify({ status: "IDLE" }));
    }

    // deduct coins first
    await prisma.user.update({
      where: { id: me.id },
      data: { balance: { decrement: mode } },
      select: { id: true },
    });

    // publish SPIN_START + persist state
    const spinId = nanoid();
    const by = dbUser.name || dbUser.login;
    const startedAt = Date.now();

    const newState: SpinState = { status: "SPINNING", spinId, by, mode, startedAt };
    await redis.set(STATE_KEY, JSON.stringify(newState));
    await redis.del(POPUP_KEY);

    await redis.publish(
      CHANNEL,
      JSON.stringify({ type: "SPIN_START", ...newState })
    );

    // keep the lock; your /api/spin/result (or the worker that decides the prize)
    // should publish SPIN_RESULT, reset state to IDLE, and DEL the lock.
    return json(200, { ok: true, spinId });
  } catch (e: any) {
    // always try to release the lock on server error
    if (lockAcquired) {
      try {
        await Redis.fromEnv().del(LOCK_KEY);
      } catch {}
    }
    console.error("[/api/spin/start] SERVER_ERROR", e);
    // include exact cause for your alert
    const details =
      typeof e?.message === "string"
        ? e.message
        : typeof e === "string"
        ? e
        : "Unknown error";
    return json(500, { error: "SERVER_ERROR", details });
  }
}
