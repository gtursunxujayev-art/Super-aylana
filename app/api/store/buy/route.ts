export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireUser } from "@/app/lib/auth";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { storeItemId } = await req.json() as { storeItemId: string };

    const si = await prisma.storeItem.findUnique({
      where: { id: storeItemId },
      include: { item: true },
    });
    if (!si || !si.active) return NextResponse.json({ error: "NOT_AVAILABLE" }, { status: 400 });
    const price = si.item.price;

    // check balance
    const fresh = await prisma.user.findUnique({ where: { id: user.id } });
    if (!fresh || fresh.balance < price) {
      return NextResponse.json({ error: "NOT_ENOUGH_COINS" }, { status: 402 });
    }

    // charge and record
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { balance: { decrement: price } } }),
      prisma.coinTxn.create({ data: { userId: user.id, delta: -price, reason: `BUY:${si.item.name}` } }),
      prisma.reward.create({
        data: {
          userId: user.id,
          itemId: si.itemId,
          mode: 0,
          result: `buy:${si.item.name}`,
          imageUrl: si.item.imageUrl ?? null,
        }
      })
    ]);

    return NextResponse.json({ ok: true, bought: { name: si.item.name, price, imageUrl: si.item.imageUrl ?? null } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "BUY_FAILED" }, { status: 500 });
  }
}
