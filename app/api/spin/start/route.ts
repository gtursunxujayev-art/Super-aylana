export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { redis, REDIS_LOCK_KEY, REDIS_STATE_KEY, REDIS_LAST_POP_KEY } from "@/app/lib/redis";
import { buildWheel, weightedPick } from "@/app/lib/wheel";
import crypto from "node:crypto";

const SPIN_MS = 8000;

async function sleep(ms: number) {
  await new Promise(res => setTimeout(res, ms));
}

async function acquireLock(userId: string) {
  const ok = await redis.set(REDIS_LOCK_KEY, userId, { nx: true, ex: Math.ceil(SPIN_MS / 1000) + 2 });
  return ok === "OK";
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { mode } = await req.json() as { mode: 50 | 100 | 200 };
    if (![50, 100, 200].includes(Number(mode))) {
      return NextResponse.json({ error: "bad mode" }, { status: 400 });
    }

    // balance check (fresh)
    const fresh = await prisma.user.findUnique({ where: { id: user.id } });
    if (!fresh || fresh.balance < Number(mode)) {
      return NextResponse.json({ error: "NOT_ENOUGH_COINS" }, { status: 402 });
    }

    // single global lock
    const locked = await acquireLock(user.id);
    if (!locked) {
      return NextResponse.json({ error: "BUSY" }, { status: 423 });
    }

    // set SPINNING state visible to everyone
    const startedAt = Date.now();
    await redis.set(
      REDIS_STATE_KEY,
      JSON.stringify({ status: "SPINNING", by: user.name, mode, startedAt }),
      { ex: Math.ceil(SPIN_MS / 1000) + 5 }
    );

    // charge coins
    await prisma.user.update({
      where: { id: user.id },
      data: { balance: { decrement: Number(mode) } },
    });

    // determine result
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

    // audit
    await prisma.spinAudit.create({
      data: {
        userId: user.id,
        mode: Number(mode),
        seed,
        entries: entries.map(e => ({ id: e.id, name: e.name, weight: e.weight, kind: e.kind })),
        picked: pick.kind === "another" ? "another_spin" : (pick.id ?? pick.name),
      },
    });

    // send immediate response so client can animate
    // (we'll publish the popup after SPIN_MS below)
    (async () => {
      // wait the duration of the spin
      await sleep(SPIN_MS);

      const popup = {
        user: user.name,
        prize: pick.kind === "another" ? "Yana bir bor aylantirish" : pick.name,
        imageUrl: pick.imageUrl ?? null,
      };

      // write popup + flip state to IDLE
      await redis.set(REDIS_LAST_POP_KEY, JSON.stringify(popup), { ex: 60 });
      await redis.set(REDIS_STATE_KEY, JSON.stringify({ status: "IDLE", by: null, result: popup }), { ex: 30 });

      // release lock
      await redis.del(REDIS_LOCK_KEY);
    })().catch(() => { /* ignore */ });

    return NextResponse.json({
      ok: true,
      result: { type: pick.kind, name: pick.name, imageUrl: pick.imageUrl ?? null, rewardId: reward.id },
      spinMs: SPIN_MS,
    });
  } catch (e) {
    console.error(e);
    // be safe: release lock on crash
    try { await redis.del(REDIS_LOCK_KEY); } catch {}
    return NextResponse.json({ error: "spin_failed" }, { status: 500 });
  }
}
