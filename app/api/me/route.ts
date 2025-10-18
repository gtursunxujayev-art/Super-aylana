export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/auth";

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "unauth" }, { status: 401 });
  return NextResponse.json({
    id: me.id,
    name: me.name,
    login: me.login,
    tgid: me.tgid,
    balance: me.balance,
    role: me.role,
  });
}
