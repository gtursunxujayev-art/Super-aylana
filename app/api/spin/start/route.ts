export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { redis, REDIS_LOCK_KEY, REDIS_STATE_KEY, REDIS_LAST_POP_KEY } from "@/app/lib/redis";
import { buildWheel, weightedPick } from "@/app/lib/wheel";
import crypto from "node:crypto";

const SPIN_MS = 8000;

async function acquireLock(userId: string) {
  const ok = await redis.set(REDIS_LOCK_KEY, userId, { nx: true, ex: Math.ceil(SPIN_MS / 1000) + 1 });
  return ok === "OK";
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { mode } = await req.json() as { mode: 50 | 100 | 200 };
    if (![50,100,200].includes(Number(mode))) return NextResponse.json({ error: "bad mode" }, { status: 400 });

    const fresh = await prisma.user.findUnique({ where: { id: user.id } });
    if (!fresh || fresh.balance < Number(mode)) return NextResponse.json({ error: "NOT_ENOUGH_COINS" }, { status: 402 });

    const locked = await acquireLock(user.id);
    if (!locked) return NextResponse.json({ error: "BUSY" }, { status: 423 });

    await redis.set(REDIS_STATE_KEY, JSON.stringify({ status: "SPINNING", by: user.name, mode, startedAt: Date.now() }), { ex: 30 });

    await prisma.user.update({ where: { id: user.id }, data: { balance: { decrement: Number(mode) } } });

    const entries = await buildWheel(mode);
    const seed = crypto.randomBytes(12).toString("hex");
    // Optionally, seed could be used to drive RNG if you prefer deterministic RNG.
    const pick = weightedPick(entries);

    const reward = await prisma.reward.create({
      data: {
        userId: user.id,
        itemId: pick.kind === "item" && pick.id ? pick.id : null,
        mode: Number(mode),
        result: pick.kind === "another" ? "another_spin" : pick.name,
        imageUrl: pick.imageUrl ?? null
      }
    });

    // AUDIT TRAIL
    await prisma.spinAudit.create({
      data: {
        userId: user.id,
        mode: Number(mode),
        seed,
        entries: entries.map(e => ({ id: e.id, name: e.name, weight: e.weight, kind: e.kind })),
        picked: pick.kind === "another" ? "another_spin" : (pick.id ?? pick.name),
      }
    });

    const popup = { user: user.name, prize: pick.kind === "another" ? "Yana bir bor aylantirish" : pick.name, imageUrl: pick.imageUrl ?? null };
    await redis.set(REDIS_LAST_POP_KEY, JSON.stringify(popup), { ex: 60 });

    await redis.set(REDIS_STATE_KEY, JSON.stringify({ status: "IDLE", by: null, result: popup }), { ex: 30 });
    await redis.del(REDIS_LOCK_KEY);

    return NextResponse.json({
      ok: true,
      result: {
        type: pick.kind,
        name: pick.name,
        imageUrl: pick.imageUrl ?? null,
        rewardId: reward.id
      },
      spinMs: SPIN_MS
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "spin_failed" }, { status: 500 });
  }
}
