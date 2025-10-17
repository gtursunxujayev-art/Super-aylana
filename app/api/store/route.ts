export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";

// Public: list active store items
export async function GET() {
  const items = await prisma.storeItem.findMany({
    where: { active: true },
    include: { item: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(items);
}

// Admin: add an Item to Store
export async function POST(req: Request) {
  const u = await getSessionUser();
  if (!u || u.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { itemId } = await req.json();
  const si = await prisma.storeItem.create({ data: { itemId } });
  return NextResponse.json(si);
}

// Admin: toggle active / edit (active?: boolean)
export async function PUT(req: Request) {
  const u = await getSessionUser();
  if (!u || u.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id, active } = await req.json();
  const si = await prisma.storeItem.update({ where: { id }, data: { active } });
  return NextResponse.json(si);
}

// Admin: remove from store
export async function DELETE(req: Request) {
  const u = await getSessionUser();
  if (!u || u.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await req.json();
  await prisma.storeItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
