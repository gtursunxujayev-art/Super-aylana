// app/api/auth/telegram/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { setSession } from "@/app/lib/auth";

/**
 * Minimal Telegram auth endpoint (without signature verification).
 * Accepts GET or POST with: tgid?, login?, name?
 * - If tgid present → use it; login defaults to tgid
 * - If tgid missing but login present → set tgid = login (required by your schema)
 */

type Input = {
  tgid?: string | null;
  login?: string | null;
  name?: string | null;
};

async function upsertFrom(input: Input) {
  const tgid = (input.tgid || "").trim();
  const loginIn = (input.login || "").trim();
  const name = (input.name || "").trim() || (tgid ? `user_${tgid}` : loginIn ? `user_${loginIn}` : "Guest");

  if (!tgid && !loginIn) throw new Error("missing_login_or_tgid");

  // prefer TGID if present
  if (tgid) {
    const byTg = await prisma.user.findUnique({
      where: { tgid },
      select: { id: true, login: true, name: true, tgid: true, balance: true, role: true },
    });
    if (byTg) return byTg;

    const created = await prisma.user.create({
      data: {
        tgid,
        login: loginIn || tgid,    // ensure login exists
        name,
        password: Math.random().toString(36).slice(2, 12),
        balance: 0,
      },
      select: { id: true, login: true, name: true, tgid: true, balance: true, role: true },
    });
    return created;
  }

  // No TGID but we have login → mirror TGID = login
  const login = loginIn;
  const byLogin = await prisma.user.findUnique({
    where: { login },
    select: { id: true, login: true, name: true, tgid: true, balance: true, role: true },
  });
  if (byLogin) return byLogin;

  const created = await prisma.user.create({
    data: {
      tgid: login,               // <-- REQUIRED: mirror login into tgid
      login,
      name,
      password: Math.random().toString(36).slice(2, 12),
      balance: 0,
    },
    select: { id: true, login: true, name: true, tgid: true, balance: true, role: true },
  });
  return created;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const input: Input = {
    tgid: url.searchParams.get("tgid"),
    login: url.searchParams.get("login"),
    name: url.searchParams.get("name"),
  };

  try {
    const user = await upsertFrom(input);
    await setSession({ tgid: user.tgid, login: user.login, name: user.name });
    return NextResponse.redirect(new URL("/wheel", url), 302);
  } catch (e: any) {
    const msg = e?.message || "server_error";
    if (msg === "missing_login_or_tgid") {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    console.error("[auth/telegram][GET]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Input;
    const user = await upsertFrom(body);
    await setSession({ tgid: user.tgid, login: user.login, name: user.name });
    return NextResponse.json(
      { ok: true, user: { id: user.id, name: user.name, role: user.role } },
      { status: 200 }
    );
  } catch (e: any) {
    const msg = e?.message || "server_error";
    if (msg === "missing_login_or_tgid") {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    console.error("[auth/telegram][POST]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
