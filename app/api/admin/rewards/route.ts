import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const me = await getSessionUser();
  if (!me || me.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const rows = await prisma.reward.findMany({
    orderBy: { createdAt: "desc" },
    include: { item: true, user: true }
  });
  return NextResponse.json(rows.map(r => ({
    id: r.id,
    username: r.user.name,
    price: r.mode,
    prize: r.result,
    imageUrl: r.imageUrl,
    createdAt: r.createdAt
  })));
}
