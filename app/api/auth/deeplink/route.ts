// app/api/auth/deeplink/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { setSession } from "@/app/lib/auth";

/**
 * Supports both GET (query params) and POST (JSON body):
 * - login?: string
 * - tgid?: string
 * - name?: string
 *
 * Example:
 *   /api/auth/deeplink?tgid=677659703&name=Giyosiddin
 *   /api/auth/deeplink?login=9999
 *
 * On success, sets cookies and redirects to /wheel (GET) or returns JSON (POST).
 */

export async function GET(req: Request) {
  const url = new URL(req.url);
  const login = url.searchParams.get("login");
  const tgid = url.searchParams.get("tgid");
  const name = url.searchParams.get("name");

  if (!login && !tgid) {
    return NextResponse.json({ error: "missing_login_or_tgid" }, { status: 400 });
  }

  await setSession({ login: login || null, tgid: tgid || null, name: name || null });

  // Redirect into the app
  return NextResponse.redirect(new URL("/wheel", url), 302);
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    login?: string | null;
    tgid?: string | null;
    name?: string | null;
  };

  const login = body.login ?? null;
  const tgid = body.tgid ?? null;
  const name = body.name ?? null;

  if (!login && !tgid) {
    return NextResponse.json({ error: "missing_login_or_tgid" }, { status: 400 });
  }

  const user = await setSession({ login, tgid, name });
  return NextResponse.json({ ok: true, user }, { status: 200 });
}
