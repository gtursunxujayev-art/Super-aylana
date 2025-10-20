// app/api/users/list/route.ts
export const runtime = "nodejs"; // Prisma needs Node runtime

import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, login: true, balance: true },
      orderBy: [{ balance: "desc" }, { name: "asc" }],
      take: 50,
    });
    return NextResponse.json(users, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("/api/users/list failed:", e);
    // Fallback: return empty list (prevents layout gaps / crashes)
    return NextResponse.json([], { status: 200, headers: { "Cache-Control": "no-store" } });
  }
}
