export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import {
  redis,
  REDIS_LOCK_KEY,
  REDIS_STATE_KEY,
  REDIS_LAST_POP_KEY,
  bumpVersion,
} from "@/app/lib/redis";
import { buildWheel, weightedPick } from "@/app/lib/wheel";
import crypto from "node:crypto";

const SPIN_MS = 8000;

const sleep = (ms:number) => new Promise(res => setTimeout(res, ms));

async function acquireLock(userId: string) {
  const ok = await redis.set(REDIS_LOCK_KEY, userId, { nx: true, ex: Math.ceil(SPIN_MS / 1000) + 2 });
  return ok === "OK";
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { mode } = await req.json() as { mode: 50 | 100 | 200 };
    if (![50, 100, 200].includes(Number(mode))) return NextResponse.json({ error: "bad mode" }, { status: 400 });

    const fresh = await prisma.user.findUnique({ where: { id: user.id } });
    if (!fresh || fresh.balance < Number(mode)) {
      return NextResponse.json({ error: "NOT_ENOUGH_COINS" }, { status: 402 });
    }

    const locked = await acquireLock(user.id);
    if (!locked) return NextResponse.json({ error: "BUSY" }, { status: 423 });

    // Immediately publish SPINNING so everyone can show "Username aylantiryapti…"
    const startedAt = Date.now();
    await redis.set(
      REDIS_STATE_KEY,
      JSON.stringify({ status: "SPINNING", by: user.name, mode, startedAt }),
      { ex: Math.ceil(SPIN_MS / 1000) + 5 }
    );
    await bumpVersion();

    // Charge coins now
    await prisma.user.update({
      where: { id: user.id },
      data: { balance: { decrement: Number(mode) } },
    });

    // Build wheel & pick
    const entries = await buildWheel(mode);
    const seed = crypto.randomBytes(12).toString("hex");
    const pick = weightedPick(entries);

    const reward = await prisma.reward.create({
      data: {
        userId: user.id,
        itemId: pick.kind === "item" && pick.id ? pick.id : null,
        mode: Number(mode),
        result: pick.kind === "another" ? "another_spin" : pick.name,
        imageUrl: pick.imageUrl ?? null,
      },
    });

    await prisma.spinAudit.create({
      data: {
        userId: user.id,
        mode: Number(mode),
        seed,
        entries: entries.map(e => ({ id: e.id, name: e.name, weight: e.weight, kind: e.kind })),
        picked: pick.kind === "another" ? "another_spin" : (pick.id ?? pick.name),
      },
    });

    // Return immediately so the spinner animates right away
    (async () => {
      await sleep(SPIN_MS);

      const popup = {
        user: user.name,
        prize: pick.kind === "another" ? "Yana bir bor aylantirish" : pick.name,
        imageUrl: pick.imageUrl ?? null,
        mode,
      };

      // Write popup + set IDLE
      await redis.set(REDIS_LAST_POP_KEY, JSON.stringify(popup), { ex: 60 });
      await redis.set(REDIS_STATE_KEY, JSON.stringify({ status: "IDLE", by: null }), { ex: 30 });
      await bumpVersion();

      // release lock
      await redis.del(REDIS_LOCK_KEY);
    })().catch(() => {});

    return NextResponse.json({
      ok: true,
      result: { type: pick.kind, name: pick.name, imageUrl: pick.imageUrl ?? null, rewardId: reward.id },
      spinMs: SPIN_MS,
    });
  } catch (e) {
    // best-effort unlock
    try { await redis.del(REDIS_LOCK_KEY); } catch {}
    return NextResponse.json({ error: "spin_failed" }, { status: 500 });
  }
}
