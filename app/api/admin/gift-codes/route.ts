export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";

export async function GET() {
  const me = await getSessionUser();
  if (!me || me.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const rows = await prisma.giftCode.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const me = await getSessionUser();
  if (!me || me.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { code, amount, maxRedemptions } = await req.json();
  const gc = await prisma.giftCode.create({ data: { code, amount: Number(amount), maxRedemptions: Number(maxRedemptions ?? 1) } });
  return NextResponse.json(gc);
}

export async function PUT(req: Request) {
  const me = await getSessionUser();
  if (!me || me.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id, active } = await req.json();
  const gc = await prisma.giftCode.update({ where: { id }, data: { active } });
  return NextResponse.json(gc);
}

export async function DELETE(req: Request) {
  const me = await getSessionUser();
  if (!me || me.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await req.json();
  await prisma.giftCode.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
