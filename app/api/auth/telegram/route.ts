import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { setSession } from "@/app/lib/auth";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { tgid, username } = await req.json() as { tgid?: string; username?: string };
    if (!tgid) return NextResponse.json({ error: "tgid required" }, { status: 400 });

    let user = await prisma.user.findUnique({ where: { tgid } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          tgid,
          login: tgid,
          name: username || `user_${tgid}`,
          password: crypto.randomBytes(16).toString("hex"),
          role: "USER"
        }
      });

      // Option A: first user becomes admin
      const adminExists = await prisma.user.findFirst({ where: { role: "ADMIN" } });
      if (!adminExists) {
        user = await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
      }
    }

    // Option B: bind to ADMIN_TGID (overrides)
    if (process.env.ADMIN_TGID && process.env.ADMIN_TGID === tgid && user.role !== "ADMIN") {
      user = await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
    }

    await setSession(user.id);
    return NextResponse.json({ ok: true, user: { id: user.id, name: user.name, role: user.role } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Auth failed" }, { status: 500 });
  }
}
