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
  genId,
} from "@/app/lib/redis";
import { buildWheel, weightedPick } from "@/app/lib/wheel";

const SPIN_MS = 8000;
const sleep = (ms:number)=>new Promise(r=>setTimeout(r,ms));

async function acquireLock(userId: string) {
  const ok = await redis.set(REDIS_LOCK_KEY, userId, { nx: true, ex: Math.ceil(SPIN_MS/1000)+3 });
  return ok === "OK";
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { mode } = await req.json() as { mode: 50|100|200 };
    if (![50,100,200].includes(Number(mode))) return NextResponse.json({ error: "bad mode" }, { status: 400 });

    const fresh = await prisma.user.findUnique({ where: { id: user.id } });
    if (!fresh || fresh.balance < Number(mode)) return NextResponse.json({ error: "NOT_ENOUGH_COINS" }, { status: 402 });

    const locked = await acquireLock(user.id);
    if (!locked) return NextResponse.json({ error: "BUSY" }, { status: 423 });

    const spinId = genId();

    // Publish global SPINNING now
    await redis.set(REDIS_STATE_KEY, JSON.stringify({
      status: "SPINNING", spinId, by: user.name, mode, startedAt: Date.now(),
    }), { ex: Math.ceil(SPIN_MS/1000)+5 });
    await bumpVersion();

    // charge coins now
    await prisma.user.update({ where: { id: user.id }, data: { balance: { decrement: Number(mode) } } });

    // build and pick
    const entries = await buildWheel(mode);
    const pick = weightedPick(entries);

    // audit and reward
    const reward = await prisma.reward.create({
      data: {
        userId: user.id,
        itemId: pick.kind === "item" && pick.id ? pick.id : null,
        mode: Number(mode),
        result: pick.kind === "another" ? "another_spin" : pick.name,
        imageUrl: pick.imageUrl ?? null,
      },
    });

    // return immediately so spinner animates
    (async ()=>{
      await sleep(SPIN_MS);

      const popup = {
        spinId,
        user: user.name,
        prize: pick.kind === "another" ? "Yana bir bor aylantirish" : pick.name,
        imageUrl: pick.imageUrl ?? null,
        mode,
      };

      await redis.set(REDIS_LAST_POP_KEY, JSON.stringify(popup), { ex: 60 });
      await redis.set(REDIS_STATE_KEY, JSON.stringify({ status: "IDLE", spinId: null }), { ex: 30 });
      await bumpVersion();
      await redis.del(REDIS_LOCK_KEY);
    })().catch(()=>{});

    return NextResponse.json({
      ok: true,
      spinId,
      result: { type: pick.kind, name: pick.name, imageUrl: pick.imageUrl ?? null, rewardId: reward.id },
      spinMs: SPIN_MS,
    });
  } catch (e) {
    try { await redis.del(REDIS_LOCK_KEY); } catch {}
    return NextResponse.json({ error: "spin_failed" }, { status: 500 });
  }
}
