export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/app/lib/prisma";
import { setSession } from "@/app/lib/auth";

function hmacSHA256(secret: string, data: string) {
  return crypto.createHmac("sha256", secret).update(data).digest("hex");
}

export async function POST(req: Request) {
  const { tgid, username, sig } = await req.json() as { tgid: string; username?: string; sig: string };
  if (!tgid || !sig) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  // Sign links in your bot like: HMAC_SHA256(TELEGRAM_BOT_TOKEN, `${tgid}:${username ?? ""}`)
  const expected = hmacSHA256(process.env.TELEGRAM_BOT_TOKEN!, `${tgid}:${username ?? ""}`);
  if (expected !== sig) return NextResponse.json({ error: "bad_signature" }, { status: 401 });

  let user = await prisma.user.findUnique({ where: { tgid } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        tgid, login: tgid, name: username || `user_${tgid}`,
        password: crypto.randomBytes(16).toString("hex")
      }
    });
  }
  // Promote if ADMIN_TGID matches
  if (process.env.ADMIN_TGID === tgid && user.role !== "ADMIN") {
    await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  }

  await setSession(user.id);
  return NextResponse.json({ ok: true });
}
