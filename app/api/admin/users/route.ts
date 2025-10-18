export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";

export async function GET() {
  const me = await getSessionUser();
  if (!me || me.role === "USER") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(users);
}

export async function PUT(req: Request) {
  const me = await getSessionUser();
  if (!me || me.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json(); // {id, name?, role?}
  const u = await prisma.user.update({ where: { id: body.id }, data: { name: body.name, role: body.role } });
  return NextResponse.json(u);
}
