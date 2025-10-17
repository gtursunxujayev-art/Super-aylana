import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await prisma.storeItem.findMany({ where: { active: true }, include: { item: true } });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const u = await getSessionUser();
  if (!u || u.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { itemId } = await req.json();
  const si = await prisma.storeItem.create({ data: { itemId } });
  return NextResponse.json(si);
}
