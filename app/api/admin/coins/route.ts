// app/api/admin/coins/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";

/**
 * Admin-only: change a user's coin balance.
 * POST body: { userId: string, delta: number, reason?: string }
 */
export async function POST(req: Request) {
  // authenticate
  const me = await getSessionUser(req);
  if (!me || me.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // parse input
  const body = (await req.json().catch(() => ({}))) as {
    userId?: string;
    delta?: number;
    reason?: string;
  };

  if (!body.userId || typeof body.delta !== "number" || !Number.isFinite(body.delta)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    // update balance
    const updated = await prisma.user.update({
      where: { id: body.userId },
      data: { balance: { increment: body.delta } },
      select: { id: true, balance: true },
    });

    // (optional) write an audit row if you have a table for it
    // await prisma.coinChange.create({ data: { userId: updated.id, delta: body.delta, reason: body.reason ?? null, adminId: me.id } });

    return NextResponse.json({ ok: true, userId: updated.id, balance: updated.balance }, { status: 200 });
  } catch (e) {
    console.error("[admin/coins] update failed:", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
