export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

export async function POST() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "unauth" }, { status: 401 });
  if (process.env.ADMIN_TGID && process.env.ADMIN_TGID === me.tgid && me.role !== "ADMIN") {
    await prisma.user.update({ where: { id: me.id }, data: { role: "ADMIN" } });
    return NextResponse.json({ ok: true, role: "ADMIN" });
  }
  return NextResponse.json({ ok: true, role: me.role });
}
