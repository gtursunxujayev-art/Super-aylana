export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";

export async function GET() {
  const me = await getSessionUser();
  if (!me || me.role === "USER") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const rows = await prisma.reward.findMany({
    orderBy: { createdAt: "desc" },
    include: { item: true, user: true },
    take: 200
  });
  return NextResponse.json(rows.map(r => ({
    id: r.id, username: r.user.name, price: r.mode, prize: r.result,
    imageUrl: r.imageUrl, status: r.status, createdAt: r.createdAt
  })));
}

export async function PUT(req: Request) {
  const me = await getSessionUser();
  if (!me || me.role === "USER") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id, status } = await req.json() as { id: string; status: "PENDING" | "DELIVERED" };
  const r = await prisma.reward.update({ where: { id }, data: { status } });
  return NextResponse.json({ ok: true, id: r.id, status: r.status });
}
