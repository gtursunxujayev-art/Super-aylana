// app/api/auth/telegram/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { setSession } from "@/app/lib/auth";

/**
 * Minimal Telegram auth endpoint.
 *
 * Accepts either GET (query) or POST (JSON) with any of:
 * - tgid?: string   // Telegram user id
 * - login?: string  // fallback login if you use it
 * - name?: string   // display name / username
 *
 * It finds or creates the user, calls setSession({ login?, tgid?, name? }),
 * and returns { ok, user } or redirects to /wheel on GET.
 *
 * NOTE: This is a minimal version without Telegram signature verification.
 * If you want full verification of initData, we can add it later.
 */

type Input = {
  tgid?: string | null;
  login?: string | null;
  name?: string | null;
};

async function upsertFrom(input: Input) {
  const tgid = input.tgid?.trim() || null;
  const login = input.login?.trim() || (tgid ? tgid : null);
  const name = input.name?.trim() || (tgid ? `user_${tgid}` : "Guest");

  if (!tgid && !login) {
    throw new Error("missing_login_or_tgid");
  }

  // Try by TGID first
  if (tgid) {
    const byTg = await prisma.user.findUnique({
      where: { tgid },
      select: { id: true, login: true, name: true, tgid: true, balance: true, role: true },
    });
    if (byTg) return byTg;

    // Else create with login=tgid (per your spec)
    const created = await prisma.user.create({
      data: {
        tgid,
        login: login ?? tgid,
        name,
        password: Math.random().toString(36).slice(2, 12),
        balance: 0,
      },
      select: { id: true, login: true, name: true, tgid: true, balance: true, role: true },
    });
    return created;
  }

  // No tgid, use login
  const byLogin = await prisma.user.findUnique({
    where: { login: login! },
    select: { id: true, login: true, name: true, tgid: true, balance: true, role: true },
  });
  if (byLogin) return byLogin;

  const created = await prisma.user.create({
    data: {
      tgid: null,
      login: login!,
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
    // IMPORTANT: setSession expects an object, not a string
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
  let body: Input = {};
  try {
    body = (await req.json().catch(() => ({}))) as Input;
    const user = await upsertFrom(body);
    // IMPORTANT: setSession expects an object, not a string
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
