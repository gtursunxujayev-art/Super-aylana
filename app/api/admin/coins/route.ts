export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";

/**
 * POST { userId: string, delta: number, reason?: string }
 * ADMIN or MODERATOR can credit/debit coins.
 */
export async function POST(req: Request) {
  const me = await getSessionUser();
  if (!me || (me.role !== "ADMIN" && me.role !== "MODERATOR")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { userId, delta, reason } = await req.json() as { userId: string; delta: number; reason?: string };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "user_not_found" }, { status: 404 });

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { balance: { increment: Number(delta) } } }),
    prisma.coinTxn.create({ data: { userId, delta: Number(delta), reason: reason ?? "ADMIN" } }),
  ]);

  return NextResponse.json({ ok: true });
}
