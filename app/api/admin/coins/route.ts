import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const me = await getSessionUser();
  if (!me || me.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { userId, delta, reason } = await req.json();
  const u = await prisma.user.update({
    where: { id: userId },
    data: { balance: { increment: Number(delta) } }
  });
  await prisma.coinTxn.create({ data: { userId, delta: Number(delta), reason: reason ?? null } });
  return NextResponse.json({ ok: true, balance: u.balance });
}
