// app/api/admin/coins/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";

/**
 * POST { userId: string, delta: number, reason?: string }
 * Admin-only: increments (or decrements) a user's balance.
 */
export async function POST(req: Request) {
  // auth
  const me = await getSessionUser(req);
  if (!me || me.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // input
  const body = (await req.json().catch(() => ({}))) as {
    userId?: string;
    delta?: number;
    reason?: string;
  };

  if (!body.userId || typeof body.delta !== "number" || !Number.isFinite(body.delta)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // update
  try {
    const updated = await prisma.user.update({
      where: { id: body.userId },
      data: { balance: { increment: body.delta } },
      select: { id: true, balance: true },
    });

    // (Optionally insert a coin-change audit row here if you have a table for it)

    return NextResponse.json(
      { ok: true, userId: updated.id, balance: updated.balance },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("[admin/coins] update failed:", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
