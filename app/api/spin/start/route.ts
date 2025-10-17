import { NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { redis, REDIS_LOCK_KEY, REDIS_STATE_KEY, REDIS_LAST_POP_KEY } from "@/app/lib/redis";
import { buildWheel, weightedPick } from "@/app/lib/wheel";

export const dynamic = "force-dynamic";

const SPIN_MS = 8000;

async function acquireLock(userId: string) {
  // SET lock if not exists, EX with ttl
  const ok = await redis.set(REDIS_LOCK_KEY, userId, { nx: true, ex: Math.ceil(SPIN_MS / 1000) + 1 });
  return ok === "OK";
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { mode } = await req.json() as { mode: 50 | 100 | 200 };
    if (![50,100,200].includes(Number(mode))) return NextResponse.json({ error: "bad mode" }, { status: 400 });

    // check balance
    if (user.balance < Number(mode)) return NextResponse.json({ error: "NOT_ENOUGH_COINS" }, { status: 402 });

    // lock
    const locked = await acquireLock(user.id);
    if (!locked) return NextResponse.json({ error: "BUSY" }, { status: 423 });

    // mark spinning state
    await redis.set(REDIS_STATE_KEY, JSON.stringify({ status: "SPINNING", by: user.name, mode, startedAt: Date.now() }), { ex: 30 });

    // deduct cost
    await prisma.user.update({ where: { id: user.id }, data: { balance: { decrement: Number(mode) } } });

    // compute result
    const entries = await buildWheel(mode);
    const pick = weightedPick(entries);

    // persist reward
    const reward = await prisma.reward.create({
      data: {
        userId: user.id,
        itemId: pick.kind === "item" && pick.id ? pick.id : null,
        mode: Number(mode),
        result: pick.kind === "another" ? "another_spin" : pick.name,
        imageUrl: pick.imageUrl ?? null
      }
    });

    // for popup to everyone
    const popup = { user: user.name, prize: pick.kind === "another" ? "Yana bir bor aylantirish" : pick.name, imageUrl: pick.imageUrl ?? null };
    await redis.set(REDIS_LAST_POP_KEY, JSON.stringify(popup), { ex: 60 });

    // finish state after SPIN_MS
    // (No background job; clients will poll state. We include chosenIndex for the spinner user)
    const payload = {
      ok: true,
      result: {
        type: pick.kind,
        name: pick.name,
        imageUrl: pick.imageUrl ?? null,
        rewardId: reward.id
      },
      spinMs: SPIN_MS
    };

    // set final state now (so others see outcome on next poll)
    await redis.set(REDIS_STATE_KEY, JSON.stringify({ status: "IDLE", by: null, result: popup }), { ex: 30 });
    await redis.del(REDIS_LOCK_KEY);

    return NextResponse.json(payload);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "spin_failed" }, { status: 500 });
  }
}
