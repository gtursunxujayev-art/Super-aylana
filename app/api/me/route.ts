// app/api/me/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  try {
    // Adjust this to your real auth (JWT, tgid, etc.)
    const c = cookies();
    const login = c.get("login")?.value; // e.g., you set this on login/register
    if (!login) return NextResponse.json(null, { status: 200 });

    const user = await prisma.user.findUnique({
      where: { login },
      select: {
        id: true,
        name: true,
        login: true,
        tgid: true,
        role: true,
        balance: true,
      },
    });

    return NextResponse.json(user ?? null, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("[/api/me] failed:", e);
    return NextResponse.json(null, { status: 200 });
  }
}
