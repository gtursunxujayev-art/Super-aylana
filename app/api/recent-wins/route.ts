export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  const rows = await prisma.reward.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: true },
    take: 10
  });
  return NextResponse.json(rows.map(r => ({
    id: r.id,
    user: r.user.name,
    prize: r.result,
    imageUrl: r.imageUrl,
    time: r.createdAt
  })));
}
