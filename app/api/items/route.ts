export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";

export async function GET() {
  const items = await prisma.item.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const u = await getSessionUser();
  if (!u || u.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json();
  const it = await prisma.item.create({ data: {
    name: body.name, price: Number(body.price), imageUrl: body.imageUrl ?? null, weight: Number(body.weight ?? 10)
  }});
  return NextResponse.json(it);
}

export async function PUT(req: Request) {
  const u = await getSessionUser();
  if (!u || u.role === "USER") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json();
  const it = await prisma.item.update({ where: { id: body.id }, data: {
    name: body.name, price: Number(body.price), imageUrl: body.imageUrl ?? null,
    active: body.active ?? true, weight: Number(body.weight ?? 10)
  }});
  return NextResponse.json(it);
}

export async function DELETE(req: Request) {
  const u = await getSessionUser();
  if (!u || u.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await req.json();
  await prisma.item.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
