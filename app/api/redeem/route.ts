export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireUser } from "@/app/lib/auth";

export async function POST(req: Request) {
  const user = await requireUser();
  const { code } = await req.json() as { code: string };
  const gc = await prisma.giftCode.findUnique({ where: { code } });
  if (!gc || !gc.active) return NextResponse.json({ error: "INVALID_CODE" }, { status: 400 });
  if (gc.redeemedCount >= gc.maxRedemptions) return NextResponse.json({ error: "ALREADY_REDEEMED_OUT" }, { status: 400 });

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { balance: { increment: gc.amount } } }),
    prisma.coinTxn.create({ data: { userId: user.id, delta: gc.amount, reason: `REDEEM:${gc.code}` } }),
    prisma.giftCode.update({ where: { id: gc.id }, data: { redeemedCount: { increment: 1 } } })
  ]);

  return NextResponse.json({ ok: true, amount: gc.amount });
}
