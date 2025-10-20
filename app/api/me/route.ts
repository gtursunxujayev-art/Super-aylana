// app/api/me/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { ensureUser } from "@/app/lib/auth";

export async function GET(req: Request) {
  try {
    const user = await ensureUser(req);
    return NextResponse.json(user, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e: any) {
    console.error("[/api/me] failed:", e);
    return NextResponse.json(null, { status: 200 });
  }
}
